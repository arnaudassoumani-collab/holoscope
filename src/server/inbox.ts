import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_OWNER_INBOX = "/Users/arnaudassoumani/soca_inbox/review/owner_review";

const SIBLING_EXTS = [".md", ".txt", ".json", ".log", ".png"] as const;

export type ArtifactPointerEntry = {
  id: string;
  pointerRel: string;
  siblingRel: string | null;
  sha256: string | null;
  mime: string | null;
  size: number | null;
  timestamp: string | null;
  receipts: {
    verified: boolean;
    diffViewed: boolean;
    hilApproved: boolean;
  };
};

export type ReadTextResult = {
  text: string;
};

export type VerifyResult =
  | {
      ok: true;
      id: string;
      pointerRel: string;
      siblingRel: string;
      wantSha256: string;
      gotSha256: string;
      receiptRel: string;
    }
  | {
      ok: false;
      id: string;
      pointerRel: string;
      siblingRel: string | null;
      wantSha256: string | null;
      gotSha256: string | null;
      error: string;
    };

export type DiffResult = {
  aRel: string;
  bRel: string;
  aText: string;
  bText: string;
  receiptRel: string;
};

export function getOwnerInboxPath(env: NodeJS.ProcessEnv): string {
  const val = (env.SOCA_OWNER_INBOX || "").trim();
  return val || DEFAULT_OWNER_INBOX;
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function ensureRelSafe(rel: string) {
  if (!rel) throw new Error("rel is required");
  if (rel.includes("\0")) throw new Error("invalid rel");
  // Block obvious traversal attempts; absolute paths are handled by resolveUnderRoot anyway.
  if (rel.startsWith("..") || rel.startsWith("/") || rel.startsWith("\\")) throw new Error("invalid rel");
}

function resolveUnderRoot(rootAbs: string, rel: string): string {
  ensureRelSafe(rel);
  const abs = path.resolve(rootAbs, rel);
  const root = path.resolve(rootAbs);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (abs !== root && !abs.startsWith(prefix)) {
    throw new Error("path escapes owner inbox");
  }
  return abs;
}

async function sha256File(absPath: string): Promise<string> {
  const h = crypto.createHash("sha256");
  const buf = await fs.readFile(absPath);
  h.update(buf);
  return h.digest("hex");
}

async function walkFiles(rootAbs: string, predicate: (absPath: string) => boolean): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [rootAbs];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir) break;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      // Skip receipts; those are read separately.
      if (ent.name === ".receipts") continue;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(abs);
      else if (ent.isFile() && predicate(abs)) out.push(abs);
    }
  }
  return out;
}

async function readReceiptsSet(ownerInboxAbs: string): Promise<Set<string>> {
  const dir = path.join(ownerInboxAbs, ".receipts");
  try {
    const entries = await fs.readdir(dir);
    return new Set(entries);
  } catch {
    return new Set();
  }
}

function receiptsForId(receipts: Set<string>, id: string) {
  const verified = Array.from(receipts).some((n) => n.includes(`__verified__${id}.`));
  const diffViewed = Array.from(receipts).some((n) => n.includes(`__diff_viewed__`) && n.includes(id));
  const hilApproved = Array.from(receipts).some((n) => n.includes(`__hil_approved__${id}.`));
  return { verified, diffViewed, hilApproved };
}

async function findSibling(absPointerPath: string): Promise<string | null> {
  const base = absPointerPath.replace(/\.artifactpointer\.json$/i, "");
  for (const ext of SIBLING_EXTS) {
    const candidate = `${base}${ext}`;
    if (await pathExists(candidate)) return candidate;
  }
  return null;
}

export async function listArtifactPointers(ownerInboxAbs: string): Promise<ArtifactPointerEntry[]> {
  const rootAbs = path.resolve(ownerInboxAbs);
  if (!(await pathExists(rootAbs))) return [];

  const receipts = await readReceiptsSet(rootAbs);

  const pointers = await walkFiles(rootAbs, (p) => p.endsWith(".artifactpointer.json"));
  pointers.sort();

  const out: ArtifactPointerEntry[] = [];
  for (const absPointerPath of pointers) {
    const pointerRel = path.relative(rootAbs, absPointerPath);
    const id = path.basename(absPointerPath).replace(/\.artifactpointer\.json$/i, "");

    let sha256: string | null = null;
    let mime: string | null = null;
    let size: number | null = null;
    let timestamp: string | null = null;
    try {
      const raw = await fs.readFile(absPointerPath, "utf-8");
      const obj = JSON.parse(raw) as Record<string, unknown>;
      sha256 = typeof obj.sha256 === "string" ? obj.sha256 : null;
      mime = typeof obj.mime === "string" ? obj.mime : null;
      size = typeof obj.size === "number" ? obj.size : null;
      timestamp = typeof obj.timestamp === "string" ? obj.timestamp : null;
    } catch {
      // ignore parse errors; surfaced on verify
    }

    const sib = await findSibling(absPointerPath);
    const siblingRel = sib ? path.relative(rootAbs, sib) : null;

    out.push({
      id,
      pointerRel,
      siblingRel,
      sha256,
      mime,
      size,
      timestamp,
      receipts: receiptsForId(receipts, id),
    });
  }
  return out;
}

export async function readTextFile(ownerInboxAbs: string, rel: string): Promise<ReadTextResult> {
  const rootAbs = path.resolve(ownerInboxAbs);
  const abs = resolveUnderRoot(rootAbs, rel);
  const st = await fs.stat(abs);
  const maxBytes = 5 * 1024 * 1024;
  if (st.size > maxBytes) {
    throw new Error(`file too large (${st.size} bytes)`);
  }
  const text = await fs.readFile(abs, "utf-8");
  return { text };
}

async function writeReceipt(ownerInboxAbs: string, fileName: string, content: string): Promise<string> {
  const receiptsDir = path.join(ownerInboxAbs, ".receipts");
  await fs.mkdir(receiptsDir, { recursive: true });
  const abs = path.join(receiptsDir, fileName);
  await fs.writeFile(abs, content, "utf-8");
  return path.relative(ownerInboxAbs, abs);
}

function utcStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getUTCFullYear();
  const mo = pad(d.getUTCMonth() + 1);
  const da = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const s = pad(d.getUTCSeconds());
  return `${y}${mo}${da}T${h}${mi}${s}Z`;
}

export async function verifyArtifactPointer(ownerInboxAbs: string, pointerRel: string): Promise<VerifyResult> {
  const rootAbs = path.resolve(ownerInboxAbs);
  const absPointerPath = resolveUnderRoot(rootAbs, pointerRel);
  const id = path.basename(absPointerPath).replace(/\.artifactpointer\.json$/i, "");

  let wantSha256: string | null = null;
  try {
    const raw = await fs.readFile(absPointerPath, "utf-8");
    const obj = JSON.parse(raw) as Record<string, unknown>;
    wantSha256 = typeof obj.sha256 === "string" ? obj.sha256 : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, id, pointerRel, siblingRel: null, wantSha256: null, gotSha256: null, error: message };
  }

  const sib = await findSibling(absPointerPath);
  if (!sib) {
    return { ok: false, id, pointerRel, siblingRel: null, wantSha256, gotSha256: null, error: "missing sibling file" };
  }
  const siblingRel = path.relative(rootAbs, sib);

  if (!wantSha256 || !/^[0-9a-fA-F]{64}$/.test(wantSha256)) {
    return { ok: false, id, pointerRel, siblingRel, wantSha256, gotSha256: null, error: "invalid sha256 in pointer" };
  }

  const gotSha256 = await sha256File(sib);
  if (gotSha256.toLowerCase() !== wantSha256.toLowerCase()) {
    return { ok: false, id, pointerRel, siblingRel, wantSha256, gotSha256, error: "sha256 mismatch" };
  }

  const ts = utcStamp();
  const receiptName = `${ts}__verified__${id}.ok`;
  const receiptContent = [
    "VERIFIED_OK",
    `utc: ${ts}`,
    `pointer_rel: ${pointerRel}`,
    `sibling_rel: ${siblingRel}`,
    `sha256: ${gotSha256}`,
    "",
  ].join("\n");
  const receiptRel = await writeReceipt(rootAbs, receiptName, receiptContent);

  return { ok: true, id, pointerRel, siblingRel, wantSha256, gotSha256, receiptRel };
}

export async function diffTextFiles(ownerInboxAbs: string, aRel: string, bRel: string): Promise<DiffResult> {
  const rootAbs = path.resolve(ownerInboxAbs);
  const aText = (await readTextFile(rootAbs, aRel)).text;
  const bText = (await readTextFile(rootAbs, bRel)).text;

  const aId = path.basename(aRel).replace(/\.[^.]+$/, "");
  const bId = path.basename(bRel).replace(/\.[^.]+$/, "");

  const ts = utcStamp();
  const receiptName = `${ts}__diff_viewed__${aId}__${bId}.ok`;
  const receiptContent = [
    "DIFF_VIEWED_OK",
    `utc: ${ts}`,
    `a_rel: ${aRel}`,
    `b_rel: ${bRel}`,
    "",
  ].join("\n");
  const receiptRel = await writeReceipt(rootAbs, receiptName, receiptContent);

  return { aRel, bRel, aText, bText, receiptRel };
}

export type HilDiffPair = { aRel: string; bRel: string };

export type HilQueueItem = {
  id: string;
  title: string;
  requestRel: string;
  pointerRel: string | null;
  diff: HilDiffPair | null;
  receipts: {
    verified: boolean;
    diffViewed: boolean;
    hilApproved: boolean;
    hilRejected: boolean;
  };
  gate: {
    canApprove: boolean;
    canReject: boolean;
    missing: string[];
  };
  error: string | null;
};

function hasHilReceipt(receipts: Set<string>, kind: "hil_approved" | "hil_rejected", id: string) {
  return Array.from(receipts).some((n) => n.includes(`__${kind}__${id}.`));
}

function hasDiffViewedForPair(receipts: Set<string>, aId: string, bId: string) {
  return Array.from(receipts).some((n) => n.includes("__diff_viewed__") && n.includes(aId) && n.includes(bId));
}

function safeString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function safeObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function artifactIdFromPointerRel(pointerRel: string): string {
  return path.basename(pointerRel).replace(/\.artifactpointer\.json$/i, "");
}

export async function listHilQueue(ownerInboxAbs: string): Promise<HilQueueItem[]> {
  const rootAbs = path.resolve(ownerInboxAbs);
  if (!(await pathExists(rootAbs))) return [];

  const receipts = await readReceiptsSet(rootAbs);
  const queueDir = path.join(rootAbs, ".hil_queue");

  let names: string[] = [];
  try {
    names = (await fs.readdir(queueDir)).filter((n) => n.endsWith(".hil_request.json"));
    names.sort();
  } catch {
    return [];
  }

  const out: HilQueueItem[] = [];
  for (const name of names) {
    const requestRel = path.join(".hil_queue", name);
    const abs = path.join(queueDir, name);
    let id: string | null = null;
    let title: string | null = null;
    let pointerRel: string | null = null;
    let diff: HilDiffPair | null = null;
    let error: string | null = null;

    try {
      const raw = await fs.readFile(abs, "utf-8");
      const obj = safeObject(JSON.parse(raw));
      if (!obj) throw new Error("invalid json");

      id = safeString(obj.id);
      title = safeString(obj.title) ?? safeString(obj.name);
      pointerRel = safeString(obj.pointerRel) ?? safeString(obj.pointer_rel);

      const diffObj = safeObject(obj.diff);
      if (diffObj) {
        const aRel = safeString(diffObj.aRel) ?? safeString(diffObj.a_rel);
        const bRel = safeString(diffObj.bRel) ?? safeString(diffObj.b_rel);
        if (aRel && bRel) diff = { aRel, bRel };
      }

      if (!id) throw new Error("missing id");
      if (!title) throw new Error("missing title");
      if (!pointerRel) throw new Error("missing pointerRel");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error = message;
    }

    const safeId = id ?? name.replace(/\.hil_request\.json$/, "");
    const hilApproved = hasHilReceipt(receipts, "hil_approved", safeId);
    const hilRejected = hasHilReceipt(receipts, "hil_rejected", safeId);

    let verified = false;
    let diffViewed = false;
    const missing: string[] = [];
    if (!error && pointerRel) {
      const artifactId = artifactIdFromPointerRel(pointerRel);
      const r = receiptsForId(receipts, artifactId);
      verified = r.verified;
      if (!verified) missing.push("verified");

      if (diff) {
        const aId = path.basename(diff.aRel).replace(/\.[^.]+$/, "");
        const bId = path.basename(diff.bRel).replace(/\.[^.]+$/, "");
        diffViewed = hasDiffViewedForPair(receipts, aId, bId);
      } else {
        diffViewed = r.diffViewed;
      }
      if (!diffViewed) missing.push("diff_viewed");
    }

    const canApprove = !error && !hilApproved && !hilRejected && verified && diffViewed;
    const canReject = !error && !hilApproved && !hilRejected;

    out.push({
      id: safeId,
      title: title ?? safeId,
      requestRel,
      pointerRel,
      diff,
      receipts: { verified, diffViewed, hilApproved, hilRejected },
      gate: { canApprove, canReject, missing },
      error,
    });
  }

  return out;
}

export async function approveHilRequest(
  ownerInboxAbs: string,
  requestRel: string,
): Promise<{ ok: true; id: string; receiptRel: string } | { ok: false; error: string }> {
  const rootAbs = path.resolve(ownerInboxAbs);
  const abs = resolveUnderRoot(rootAbs, requestRel);
  const raw = await fs.readFile(abs, "utf-8");
  const obj = safeObject(JSON.parse(raw));
  if (!obj) return { ok: false, error: "invalid json" };

  const id = safeString(obj.id);
  const title = safeString(obj.title) ?? safeString(obj.name);
  const pointerRel = safeString(obj.pointerRel) ?? safeString(obj.pointer_rel);
  if (!id || !title || !pointerRel) return { ok: false, error: "missing required fields: id/title/pointerRel" };

  const receipts = await readReceiptsSet(rootAbs);
  if (hasHilReceipt(receipts, "hil_approved", id) || hasHilReceipt(receipts, "hil_rejected", id)) {
    return { ok: false, error: "already decided" };
  }

  const artifactId = artifactIdFromPointerRel(pointerRel);
  const r = receiptsForId(receipts, artifactId);
  const missing: string[] = [];
  if (!r.verified) missing.push("verified");

  let diffOk = r.diffViewed;
  const diffObj = safeObject(obj.diff);
  if (diffObj) {
    const aRel = safeString(diffObj.aRel) ?? safeString(diffObj.a_rel);
    const bRel = safeString(diffObj.bRel) ?? safeString(diffObj.b_rel);
    if (aRel && bRel) {
      const aId = path.basename(aRel).replace(/\.[^.]+$/, "");
      const bId = path.basename(bRel).replace(/\.[^.]+$/, "");
      diffOk = hasDiffViewedForPair(receipts, aId, bId);
    }
  }
  if (!diffOk) missing.push("diff_viewed");

  if (missing.length) return { ok: false, error: `missing receipts: ${missing.join(", ")}` };

  const ts = utcStamp();
  const receiptName = `${ts}__hil_approved__${id}.ok`;
  const receiptContent = ["HIL_APPROVED_OK", `utc: ${ts}`, `id: ${id}`, `title: ${title}`, `pointer_rel: ${pointerRel}`, ""].join(
    "\n",
  );
  const receiptRel = await writeReceipt(rootAbs, receiptName, receiptContent);
  return { ok: true, id, receiptRel };
}

export async function rejectHilRequest(
  ownerInboxAbs: string,
  requestRel: string,
): Promise<{ ok: true; id: string; receiptRel: string } | { ok: false; error: string }> {
  const rootAbs = path.resolve(ownerInboxAbs);
  const abs = resolveUnderRoot(rootAbs, requestRel);
  const raw = await fs.readFile(abs, "utf-8");
  const obj = safeObject(JSON.parse(raw));
  if (!obj) return { ok: false, error: "invalid json" };

  const id = safeString(obj.id);
  const title = safeString(obj.title) ?? safeString(obj.name);
  if (!id || !title) return { ok: false, error: "missing required fields: id/title" };

  const receipts = await readReceiptsSet(rootAbs);
  if (hasHilReceipt(receipts, "hil_approved", id) || hasHilReceipt(receipts, "hil_rejected", id)) {
    return { ok: false, error: "already decided" };
  }

  const ts = utcStamp();
  const receiptName = `${ts}__hil_rejected__${id}.ok`;
  const receiptContent = ["HIL_REJECTED_OK", `utc: ${ts}`, `id: ${id}`, `title: ${title}`, ""].join("\n");
  const receiptRel = await writeReceipt(rootAbs, receiptName, receiptContent);
  return { ok: true, id, receiptRel };
}

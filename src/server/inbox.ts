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


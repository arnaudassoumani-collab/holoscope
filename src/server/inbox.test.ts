import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  DEFAULT_OWNER_INBOX,
  approveHilRequest,
  diffTextFiles,
  getOwnerInboxPath,
  listArtifactPointers,
  listHilQueue,
  pathExists,
  verifyArtifactPointer,
} from "./inbox";

function sha256Text(s: string) {
  const h = crypto.createHash("sha256");
  h.update(Buffer.from(s, "utf-8"));
  return h.digest("hex");
}

describe("inbox helpers", () => {
  it("getOwnerInboxPath uses env var when set", () => {
    const got = getOwnerInboxPath({ SOCA_OWNER_INBOX: "/tmp/x" } as NodeJS.ProcessEnv);
    expect(got).toBe("/tmp/x");
  });

  it("getOwnerInboxPath falls back to default", () => {
    const got = getOwnerInboxPath({} as NodeJS.ProcessEnv);
    expect(got).toBe(DEFAULT_OWNER_INBOX);
  });

  it("listArtifactPointers returns empty for missing dir", async () => {
    const dir = path.join(os.tmpdir(), `holoscope-missing-${Date.now()}`);
    const items = await listArtifactPointers(dir);
    expect(items).toEqual([]);
  });

  it("verify and diff write receipts", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "holoscope-inbox-"));
    try {
      const id = "run_001";
      const artifactText = "line1\nline2\n";
      const sha = sha256Text(artifactText);

      await fs.writeFile(path.join(root, `${id}.md`), artifactText, "utf-8");
      await fs.writeFile(
        path.join(root, `${id}.artifactpointer.json`),
        JSON.stringify({ sha256: sha, path: `/tmp/${id}.md`, root: "test" }, null, 2),
        "utf-8",
      );

      const pointers = await listArtifactPointers(root);
      expect(pointers).toHaveLength(1);
      expect(pointers[0]?.id).toBe(id);
      expect(pointers[0]?.siblingRel).toBe(`${id}.md`);

      const vr = await verifyArtifactPointer(root, `${id}.artifactpointer.json`);
      expect(vr.ok).toBe(true);
      expect(await pathExists(path.join(root, ".receipts"))).toBe(true);

      await fs.writeFile(path.join(root, `other.md`), "line1\nCHANGED\n", "utf-8");
      const dr = await diffTextFiles(root, `${id}.md`, "other.md");
      expect(dr.receiptRel).toMatch(/\.receipts/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("HIL queue approval is gated by receipts", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "holoscope-hil-"));
    try {
      const id = "run_002";
      const artifactText = "a\nb\n";
      const sha = sha256Text(artifactText);

      await fs.writeFile(path.join(root, `${id}.md`), artifactText, "utf-8");
      await fs.writeFile(
        path.join(root, `${id}.artifactpointer.json`),
        JSON.stringify({ sha256: sha, path: `/tmp/${id}.md`, root: "test" }, null, 2),
        "utf-8",
      );
      await fs.writeFile(path.join(root, "other.md"), "a\nCHANGED\n", "utf-8");

      await fs.mkdir(path.join(root, ".hil_queue"), { recursive: true });
      const reqName = "req_001.hil_request.json";
      await fs.writeFile(
        path.join(root, ".hil_queue", reqName),
        JSON.stringify(
          {
            id: "HIL-REQ-001",
            title: "Approve sample",
            pointerRel: `${id}.artifactpointer.json`,
            diff: { aRel: `${id}.md`, bRel: "other.md" },
          },
          null,
          2,
        ),
        "utf-8",
      );

      let items = await listHilQueue(root);
      expect(items).toHaveLength(1);
      expect(items[0]?.gate.canApprove).toBe(false);

      await verifyArtifactPointer(root, `${id}.artifactpointer.json`);
      await diffTextFiles(root, `${id}.md`, "other.md");

      items = await listHilQueue(root);
      expect(items[0]?.gate.canApprove).toBe(true);

      const ar = await approveHilRequest(root, path.join(".hil_queue", reqName));
      expect(ar.ok).toBe(true);

      items = await listHilQueue(root);
      expect(items[0]?.receipts.hilApproved).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

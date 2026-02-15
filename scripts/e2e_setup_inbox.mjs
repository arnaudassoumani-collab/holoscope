#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

function sha256Text(text) {
  const h = crypto.createHash("sha256");
  h.update(Buffer.from(text, "utf-8"));
  return h.digest("hex");
}

async function writeJson(absPath, obj) {
  const text = JSON.stringify(obj, null, 2) + "\n";
  await fs.writeFile(absPath, text, "utf-8");
}

async function main() {
  const rootArg = process.argv[2];
  if (!rootArg) {
    console.error("Usage: e2e_setup_inbox.mjs <abs_or_rel_inbox_path>");
    process.exit(2);
  }

  const root = path.resolve(rootArg);

  await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(root, { recursive: true });
  await fs.mkdir(path.join(root, ".hil_queue"), { recursive: true });
  await fs.mkdir(path.join(root, ".receipts"), { recursive: true });

  const artifacts = [
    { id: "run_001", text: "alpha\nbeta\n", ext: ".md" },
    { id: "run_002", text: "alpha\nBETA_CHANGED\n", ext: ".md" },
  ];

  for (const a of artifacts) {
    const artifactName = `${a.id}${a.ext}`;
    const pointerName = `${a.id}.artifactpointer.json`;

    await fs.writeFile(path.join(root, artifactName), a.text, "utf-8");
    const sha256 = sha256Text(a.text);
    await writeJson(path.join(root, pointerName), {
      sha256,
      path: artifactName,
      root: "playwright-e2e",
      mime: "text/markdown",
      size: Buffer.byteLength(a.text, "utf-8"),
      timestamp: new Date().toISOString(),
    });
  }

  await writeJson(path.join(root, ".hil_queue", "HIL-REQ-001.hil_request.json"), {
    id: "HIL-REQ-001",
    title: "Approve sample run_001",
    pointerRel: "run_001.artifactpointer.json",
    diff: { aRel: "run_001.md", bRel: "run_002.md" },
  });

  process.stdout.write(`e2e inbox prepared: ${root}\n`);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  console.error(msg);
  process.exit(1);
});


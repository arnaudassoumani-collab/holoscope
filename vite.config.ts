import type { Connect } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { componentTagger } from "lovable-tagger";
import { configDefaults, defineConfig } from "vitest/config";
import {
  DEFAULT_OWNER_INBOX,
  approveHilRequest,
  diffTextFiles,
  getOwnerInboxPath,
  listArtifactPointers,
  listHilQueue,
  pathExists,
  readTextFile,
  rejectHilRequest,
  verifyArtifactPointer,
} from "./src/server/inbox";

function json(res: Connect.ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body, null, 2));
}

async function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function holoscopeLocalApi(): import("vite").Plugin {
  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    try {
      if (!req.url) return next();
      const u = new URL(req.url, "http://localhost");

      if (u.pathname === "/api/admin/config" && req.method === "GET") {
        const ownerInbox = getOwnerInboxPath(process.env);
        const exists = await pathExists(ownerInbox);
        return json(res, 200, {
          holoEnv: process.env.HOLO_ENV ?? null,
          ownerInbox,
          ownerInboxExists: exists,
          defaultOwnerInbox: DEFAULT_OWNER_INBOX,
        });
      }

      if (u.pathname === "/api/inbox/pointers" && req.method === "GET") {
        const ownerInbox = getOwnerInboxPath(process.env);
        const pointers = await listArtifactPointers(ownerInbox);
        return json(res, 200, { ownerInbox, pointers });
      }

      if (u.pathname === "/api/inbox/file" && req.method === "GET") {
        const ownerInbox = getOwnerInboxPath(process.env);
        const rel = u.searchParams.get("rel") ?? "";
        const data = await readTextFile(ownerInbox, rel);
        return json(res, 200, { ownerInbox, rel, ...data });
      }

      if (u.pathname === "/api/inbox/verify" && req.method === "POST") {
        const ownerInbox = getOwnerInboxPath(process.env);
        const body = (await readJsonBody(req)) as { pointerRel?: string };
        if (!body.pointerRel) return json(res, 400, { error: "pointerRel required" });
        const result = await verifyArtifactPointer(ownerInbox, body.pointerRel);
        return json(res, result.ok ? 200 : 409, { ownerInbox, ...result });
      }

      if (u.pathname === "/api/inbox/diff" && req.method === "POST") {
        const ownerInbox = getOwnerInboxPath(process.env);
        const body = (await readJsonBody(req)) as { aRel?: string; bRel?: string };
        if (!body.aRel || !body.bRel) return json(res, 400, { error: "aRel and bRel required" });
        const result = await diffTextFiles(ownerInbox, body.aRel, body.bRel);
        return json(res, 200, { ownerInbox, ...result });
      }

      if (u.pathname === "/api/hil/queue" && req.method === "GET") {
        const ownerInbox = getOwnerInboxPath(process.env);
        const items = await listHilQueue(ownerInbox);
        return json(res, 200, { ownerInbox, items });
      }

      if (u.pathname === "/api/hil/approve" && req.method === "POST") {
        const ownerInbox = getOwnerInboxPath(process.env);
        const body = (await readJsonBody(req)) as { requestRel?: string };
        if (!body.requestRel) return json(res, 400, { error: "requestRel required" });
        const result = await approveHilRequest(ownerInbox, body.requestRel);
        return json(res, result.ok ? 200 : 409, { ownerInbox, ...result });
      }

      if (u.pathname === "/api/hil/reject" && req.method === "POST") {
        const ownerInbox = getOwnerInboxPath(process.env);
        const body = (await readJsonBody(req)) as { requestRel?: string };
        if (!body.requestRel) return json(res, 400, { error: "requestRel required" });
        const result = await rejectHilRequest(ownerInbox, body.requestRel);
        return json(res, result.ok ? 200 : 409, { ownerInbox, ...result });
      }

      return next();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json(res, 500, { error: message });
    }
  };

  return {
    name: "holoscope-local-api",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  test: {
    exclude: [...configDefaults.exclude, "**/e2e/**", "**/playwright-report/**", "**/test-results/**"],
  },
  plugins: [react(), holoscopeLocalApi(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

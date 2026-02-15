import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const e2eInbox = path.join(__dirname, ".playwright", "owner_inbox");

// Make the inbox path visible to tests and consistent with the dev server env.
process.env.SOCA_OWNER_INBOX = process.env.SOCA_OWNER_INBOX || e2eInbox;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node scripts/e2e_setup_inbox.mjs "${process.env.SOCA_OWNER_INBOX}" && npm run dev -- --host 127.0.0.1 --port 5173`,
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      HOLO_ENV: "development",
      SOCA_OWNER_INBOX: process.env.SOCA_OWNER_INBOX,
    },
  },
});

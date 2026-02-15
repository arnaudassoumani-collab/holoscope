import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const OWNER_INBOX = (process.env.SOCA_OWNER_INBOX || "").trim();
if (!OWNER_INBOX) throw new Error("SOCA_OWNER_INBOX is required for e2e tests");

test("HIL queue dominates, gates approvals, and writes receipts", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("header-owner-inbox")).toContainText("owner_inbox");

  // Pending HIL request should pull the UI into the HIL tab and render the card.
  await expect(page.getByTestId("hil-item-HIL-REQ-001")).toBeVisible();

  await expect(page.getByTestId("hil-approve-HIL-REQ-001")).toBeDisabled();
  await expect(page.getByTestId("hil-missing-HIL-REQ-001")).toContainText("verified");
  await expect(page.getByTestId("hil-missing-HIL-REQ-001")).toContainText("diff_viewed");

  // Verify should flip the receipt state for the underlying artifact pointer.
  await page.getByTestId("hil-verify-HIL-REQ-001").click();
  await expect(page.getByTestId("hil-status-verified-HIL-REQ-001")).toHaveText("yes");

  // Viewing the diff should mint a diff_viewed receipt and unblock approval.
  await page.getByTestId("hil-review-diff-HIL-REQ-001").click();
  await expect(page.getByTestId("diff-dialog")).toBeVisible();
  await expect(page.getByTestId("diff-dialog-receipt")).not.toHaveText("");
  await page.keyboard.press("Escape");

  await expect(page.getByTestId("hil-status-diffviewed-HIL-REQ-001")).toHaveText("yes");
  await expect(page.getByTestId("hil-approve-HIL-REQ-001")).toBeEnabled();

  await page.getByTestId("hil-approve-HIL-REQ-001").click();
  await expect(page.getByTestId("hil-status-approved-HIL-REQ-001")).toHaveText("yes");

  // Runs And Evidence should reflect receipts and allow viewing artifacts/diffs.
  await page.getByTestId("tab-runs").click();

  await expect(page.getByTestId("pointer-row-run_001")).toBeVisible();
  await expect(page.getByTestId("pointer-verified-run_001")).toHaveText("yes");

  await page.getByTestId("pointer-diffsel-run_001").check();
  await page.getByTestId("pointer-diffsel-run_002").check();
  await expect(page.getByTestId("runs-open-diff")).toBeEnabled();

  await page.getByTestId("runs-open-diff").click();
  await expect(page.getByTestId("diff-dialog")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByTestId("pointer-view-run_001").click();
  await expect(page.getByTestId("file-dialog")).toBeVisible();
  await expect(page.getByTestId("file-dialog-content")).toContainText("beta");
  await page.keyboard.press("Escape");

  // Disk receipts are the truth source.
  const receiptsDir = path.join(OWNER_INBOX, ".receipts");
  const names = await fs.readdir(receiptsDir);
  expect(names.some((n) => n.includes("__verified__run_001."))).toBeTruthy();
  expect(names.some((n) => n.includes("__diff_viewed__") && n.includes("run_001") && n.includes("run_002"))).toBeTruthy();
  expect(names.some((n) => n.includes("__hil_approved__HIL-REQ-001."))).toBeTruthy();
});


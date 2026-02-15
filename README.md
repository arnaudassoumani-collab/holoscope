# HOLOSCOPE

Local evidence review UI for SOCA owner inbox artifacts.

## Quickstart (soca_inbox workspace)

Recommended layout:

```bash
mkdir -p /Users/arnaudassoumani/soca_inbox/{apps,review,logs}
mkdir -p /Users/arnaudassoumani/soca_inbox/review/owner_review
```

Pull artifacts from VPS outbox into the owner inbox (example):

```bash
rsync -avz soca-vps:/opt/soca/outbox/owner_review/ /Users/arnaudassoumani/soca_inbox/review/owner_review/
```

Run the UI:

```bash
cd /Users/arnaudassoumani/soca_inbox/apps/holoscope
./run_local.sh
```

## Configuration

`SOCA_OWNER_INBOX` (optional): Absolute path to the owner inbox directory. Default is:

`/Users/arnaudassoumani/soca_inbox/review/owner_review`

The UI shows the resolved path in Admin and marks it missing if the directory does not exist.

## GREEN Check

Run the deterministic GREEN pack (repo + inbox governance gates + npm lint/test/build):

```bash
export SOCA_OWNER_INBOX="/Users/arnaudassoumani/soca_inbox/review/owner_review"
./scripts/green_check.sh
```

On success, it writes a Mac-side receipt into:

`$SOCA_OWNER_INBOX/.receipts/<UTC>__owner_green.ok`

## What The UI Provides

- Admin: shows current owner inbox path and existence check.
- Runs And Evidence: lists `*.artifactpointer.json` bundles and supports:
  - Verify: recompute sha256 and write `__verified__...` receipt files.
  - View: open the artifact file content.
  - Diff: open a simple side-by-side diff and write `__diff_viewed__...` receipt files.

## Tech

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS


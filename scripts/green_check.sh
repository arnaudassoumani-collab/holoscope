#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "${REPO_ROOT}"

OWNER_INBOX="${SOCA_OWNER_INBOX:-/Users/arnaudassoumani/soca_inbox/review/owner_review}"
RECEIPTS_DIR="${OWNER_INBOX}/.receipts"

mkdir -p "${RECEIPTS_DIR}"

ts="$(date -u +"%Y%m%dT%H%M%SZ")"
receipt="${RECEIPTS_DIR}/${ts}__owner_green.ok"

echo "GREEN CHECK starting"
echo "repo: ${REPO_ROOT}"
echo "owner_inbox: ${OWNER_INBOX}"

if [[ ! -d "${OWNER_INBOX}" ]]; then
  echo "FAIL: owner inbox missing: ${OWNER_INBOX}" >&2
  exit 1
fi

echo "1) emoji-lint repo"
python3 scripts/emoji_lint.py "${REPO_ROOT}" >/tmp/emoji_repo.out
cat /tmp/emoji_repo.out

echo "2) emoji-lint inbox"
python3 scripts/emoji_lint.py "${OWNER_INBOX}" >/tmp/emoji_inbox.out
cat /tmp/emoji_inbox.out

echo "3) artifactpointer + no-black-box audit"
./scripts/no_black_box_audit.sh "${OWNER_INBOX}"

echo "4) npm lint/test/build"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run lint
npm run test
npm run build

gitsha="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
{
  echo "OWNER_GREEN_OK"
  echo "utc: ${ts}"
  echo "repo: ${REPO_ROOT}"
  echo "git_sha: ${gitsha}"
  echo "owner_inbox: ${OWNER_INBOX}"
  echo "checks:"
  echo "  emoji_repo: PASS"
  echo "  emoji_inbox: PASS"
  echo "  artifactpointer: PASS"
  echo "  no_black_box: PASS"
  echo "  npm_lint: PASS"
  echo "  npm_test: PASS"
  echo "  npm_build: PASS"
} > "${receipt}"

echo "GREEN CHECK: PASS"
echo "receipt: ${receipt}"


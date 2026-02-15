#!/usr/bin/env bash
set -euo pipefail

INBOX="${1:-}"
if [[ -z "${INBOX}" ]]; then
  echo "Usage: $0 <owner_inbox_dir>" >&2
  exit 2
fi

# Contract check:
# - Every .artifactpointer.json must have a sibling file
# - sha256 must match
# - receipts dir exists (optional but recommended)
./scripts/validate_artifact_pointers.sh "${INBOX}"

if [[ ! -d "${INBOX}/.receipts" ]]; then
  echo "no-black-box: WARN missing receipts dir: ${INBOX}/.receipts"
else
  echo "no-black-box: OK receipts dir present"
fi

echo "no-black-box: PASS"


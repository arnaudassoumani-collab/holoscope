#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

export HOLO_ENV=development
export SOCA_OWNER_INBOX="${SOCA_OWNER_INBOX:-/Users/arnaudassoumani/soca_inbox/review/owner_review}"

echo "Owner inbox: $SOCA_OWNER_INBOX"

npm install
npm run dev -- --host 127.0.0.1 --port 5173


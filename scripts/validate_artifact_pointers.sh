#!/usr/bin/env bash
set -euo pipefail

INBOX="${1:-}"
if [[ -z "${INBOX}" ]]; then
  echo "Usage: $0 <owner_inbox_dir>" >&2
  exit 2
fi
if [[ ! -d "${INBOX}" ]]; then
  echo "ERROR: inbox not found: ${INBOX}" >&2
  exit 2
fi

# sha helper (mac/linux)
sha256_file() {
  local f="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$f" | awk '{print $1}'
  else
    shasum -a 256 "$f" | awk '{print $1}'
  fi
}

# minimal JSON parse without jq
py_get() {
  local file="$1"
  local key="$2"
  python3 - "$file" "$key" <<'PY'
import json,sys
p=sys.argv[1]
k=sys.argv[2]
with open(p,'r',encoding='utf-8') as f:
    obj=json.load(f)
v=obj.get(k,"")
if isinstance(v,(dict,list)):
    print("")
else:
    print(str(v))
PY
}

bad=0
count=0

while IFS= read -r -d '' j; do
  count=$((count+1))
  base="${j%.artifactpointer.json}"
  sib=""
  for ext in ".md" ".txt" ".json" ".log" ".png"; do
    if [[ -f "${base}${ext}" ]]; then
      sib="${base}${ext}"
      break
    fi
  done
  if [[ -z "${sib}" ]]; then
    echo "[POINTER] FAIL missing sibling for: ${j}"
    bad=$((bad+1))
    continue
  fi

  sha="$(py_get "$j" "sha256")"
  if [[ -z "${sha}" || ! "${sha}" =~ ^[0-9a-fA-F]{64}$ ]]; then
    echo "[POINTER] FAIL invalid sha256 in: ${j}"
    bad=$((bad+1))
    continue
  fi

  actual="$(sha256_file "${sib}")"
  actual_lc="$(printf '%s' "${actual}" | tr '[:upper:]' '[:lower:]')"
  sha_lc="$(printf '%s' "${sha}" | tr '[:upper:]' '[:lower:]')"
  if [[ "${actual_lc}" != "${sha_lc}" ]]; then
    echo "[POINTER] FAIL sha mismatch:
  pointer: ${j}
  file:    ${sib}
  want:    ${sha}
  got:     ${actual}"
    bad=$((bad+1))
    continue
  fi

  pathv="$(py_get "$j" "path")"
  rootv="$(py_get "$j" "root")"
  if [[ -z "${pathv}" || -z "${rootv}" ]]; then
    echo "[POINTER] WARN missing path/root in: ${j}"
  fi
done < <(find "${INBOX}" -type f -name "*.artifactpointer.json" -print0)

if [[ "${count}" -eq 0 ]]; then
  echo "artifactpointer: FAIL (0 pointers found in ${INBOX})"
  exit 1
fi

if [[ "${bad}" -gt 0 ]]; then
  echo "artifactpointer: FAIL (${bad}/${count} pointers)"
  exit 1
fi

echo "artifactpointer: PASS (${count} pointers)"

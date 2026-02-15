#!/usr/bin/env python3
import pathlib
import sys

# Conservative emoji detection: common emoji blocks + variation selectors + ZWJ
# This catches most emoji while minimizing false positives.
EMOJI_RANGES = [
    (0x1F300, 0x1FAFF),  # Misc Symbols & Pictographs..Symbols and Pictographs Extended-A
    (0x2600, 0x26FF),  # Misc symbols
    (0x2700, 0x27BF),  # Dingbats
]
SPECIALS = {0x200D, 0xFE0F}  # ZWJ, VS16

IGNORE_DIRS = {
    ".git",
    ".next",
    ".svelte-kit",
    ".turbo",
    "build",
    "coverage",
    "dist",
    "node_modules",
}


def is_emoji(cp: int) -> bool:
    if cp in SPECIALS:
        return True
    for lo, hi in EMOJI_RANGES:
        if lo <= cp <= hi:
            return True
    return False


def scan_file(p: pathlib.Path):
    try:
        text = p.read_text(encoding="utf-8", errors="strict")
    except Exception:
        # Skip binary/unreadable
        return []

    hits = []
    for i, ch in enumerate(text):
        cp = ord(ch)
        if is_emoji(cp):
            hits.append((i, ch, cp))
    return hits


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: emoji_lint.py <path> [<path>...]", file=sys.stderr)
        return 2

    paths = [pathlib.Path(a) for a in sys.argv[1:]]
    files = []
    for p in paths:
        if p.is_dir():
            for ext in (
                ".md",
                ".txt",
                ".json",
                ".ts",
                ".js",
                ".tsx",
                ".svelte",
                ".css",
                ".html",
                ".yml",
                ".yaml",
            ):
                for f in p.rglob(f"*{ext}"):
                    if any(part in IGNORE_DIRS for part in f.parts):
                        continue
                    files.append(f)
        elif p.is_file():
            files.append(p)

    bad = 0
    for f in sorted(set(files)):
        hits = scan_file(f)
        if hits:
            bad += 1
            sample = ", ".join([f"U+{cp:04X}" for _, _, cp in hits[:6]])
            print(f"[EMOJI] {f} -> {sample}")

    if bad:
        print(f"emoji-lint: FAIL ({bad} files)")
        return 1

    print("emoji-lint: PASS (0 found)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

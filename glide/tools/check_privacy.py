#!/usr/bin/env python3
"""Keep machine-local and personal data out of this public repo.

Scans every line this repo adds on top of upstream (alt-glitch/hermes-tern) for absolute home or
mount paths, tailnet hosts and addresses, personal email addresses and credential shapes. Generated
bundles and lockfiles are skipped. A line that must keep a match (a test asserting a path is
redacted, say) ends with the marker `privacy: ok`.

    python glide/tools/check_privacy.py [--upstream REF]   # default REF: upstream/main

For a staged text-only artifact, scan every line without repository exclusions or waivers:

    python glide/tools/check_privacy.py --directory DIR

reuse-checked: the host's chatgpt-driver privacy_gate -- it needs private rules that cannot live in
a public repo, so CI uses only generic shapes here.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKIP = re.compile(r"^(frontend/dist/|frontend/src/vendor/)|(^|/)(pnpm-lock\.yaml|package-lock\.json|bun\.lockb?|uv\.lock)$")
PLACEHOLDER_USERS = r"(?!(?:user|me|you|agent|runner|example|someone|alice|bob|name)/)"
RULES = {
    "home path": re.compile(rf"/(?:home|Users)/{PLACEHOLDER_USERS}[A-Za-z0-9_.-]+/"),
    "mount path": re.compile(r"/mnt/[A-Za-z0-9_.-]+/"),
    "tailnet host": re.compile(r"\b[\w-]+\.ts\.net\b"),
    "tailnet address": re.compile(r"\b100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b"),
    "personal email": re.compile(r"\b[\w.+-]+@(?:gmail|googlemail|yahoo|hotmail|outlook|icloud|proton(?:mail)?)\.\w+", re.I),
    "credential": re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{24,}|AKIA[0-9A-Z]{16}|xox[abp]-[\w-]{20,})|BEGIN [A-Z ]*PRIVATE KEY"),
}


def added_lines(base: str):
    diff = subprocess.run(["git", "diff", "--no-color", "-U0", base, "HEAD"], cwd=ROOT, check=True,
                          capture_output=True, text=True, errors="replace").stdout
    path, line = None, 0
    for raw in diff.splitlines():
        if raw.startswith("+++ "):
            path = raw[6:] if raw.startswith("+++ b/") else None
        elif raw.startswith("@@"):
            hunk = re.search(r"\+(\d+)", raw)
            line = int(hunk.group(1)) if hunk else 0
        elif raw.startswith("+") and path:
            yield path, line, raw[1:]
            line += 1


def scan_line(path: str, n: int, text: str) -> int:
    hits = 0
    for name, rule in RULES.items():
        if rule.search(text):
            hits += 1
            print(f"{path}:{n}: {name}")
    return hits


def scan_directory(directory: Path) -> int:
    if not directory.is_dir() or directory.is_symlink():
        print("privacy: expected a real artifact directory", file=sys.stderr)
        return 1

    files = hits = 0
    for path in sorted(directory.rglob("*")):
        relative = path.relative_to(directory).as_posix()
        if not path.is_symlink() and path.is_dir():
            continue
        if path.is_symlink() or not path.is_file():
            print(f"privacy: not a regular file: {relative}", file=sys.stderr)
            return 1
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except (OSError, UnicodeError):
            print(f"privacy: cannot read as UTF-8: {relative}", file=sys.stderr)
            return 1
        files += 1
        for n, line in enumerate(lines, 1):
            hits += scan_line(relative, n, line)

    print(f"privacy: {hits} finding(s) in {files} artifact file(s)")
    return 1 if hits or not files else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--upstream", default="upstream/main")
    mode.add_argument("--directory", type=Path)
    args = ap.parse_args()
    if args.directory is not None:
        return scan_directory(args.directory)
    ref = args.upstream
    base = subprocess.run(["git", "merge-base", ref, "HEAD"], cwd=ROOT, check=True,
                          capture_output=True, text=True).stdout.strip()
    hits = 0
    for path, n, text in added_lines(base):
        if SKIP.search(path) or text.rstrip().endswith("privacy: ok"):
            continue
        hits += scan_line(path, n, text)
    print(f"privacy: {hits} finding(s) in lines added on top of {ref}")
    return 1 if hits else 0


if __name__ == "__main__":
    sys.exit(main())

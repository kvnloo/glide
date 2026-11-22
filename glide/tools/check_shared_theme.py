#!/usr/bin/env python3
"""Hold Glide's pinned copy of the shared theme (kvnloo/ephemeral-ui theme/) to its pin and to upstream.

Glide wears ``glide/themes/shared/glide.json``, a verbatim copy of ephemeral-ui's ``theme/glide.json`` at the
commit ``glide/themes/shared/PIN.json`` names. The pin also records the card catalog's version, its sha256 and
its kinds, so a kind the catalog adds after the pin is named here instead of passing unseen.

    python glide/tools/check_shared_theme.py                       # the copy matches its pin (offline)
    python glide/tools/check_shared_theme.py --upstream DIR        # ... and DIR (an ephemeral-ui checkout) has
                                                                   #     nothing newer: exit 1 when stale
    python glide/tools/check_shared_theme.py --upstream main       # the same against GitHub (raw URL at a ref)
    python glide/tools/check_shared_theme.py --vendor DIR          # re-vendor from a checkout and rewrite PIN.json
"""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

SHARED = Path(__file__).resolve().parents[1] / "themes" / "shared"
PIN = SHARED / "PIN.json"
REPO = "kvnloo/ephemeral-ui"
FILES = ("theme/glide.json", "theme/tokens.schema.json")
CATALOG = "catalog/catalog.json"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def local(path: str) -> Path:
    return SHARED / Path(path).name


def pin() -> dict:
    return json.loads(PIN.read_text())


def check_copy(p: dict) -> list[str]:
    """Problems with the vendored files themselves: edited by hand, missing, or not a v0 theme."""
    problems = []
    for path, want in p["files"].items():
        f = local(path)
        if not f.exists():
            problems.append(f"{f.name}: missing (re-vendor with --vendor)")
        elif sha256(f.read_bytes()) != want:
            problems.append(f"{f.name}: differs from the pinned {REPO}@{p['sha'][:7]} copy; never edit it, re-vendor")
    theme = json.loads(local("theme/glide.json").read_text())
    if theme.get("v") != 0:
        problems.append(f"glide.json: v is {theme.get('v')!r}, Glide reads v 0 only")
    if theme.get("version") != p["theme"]["version"]:
        problems.append(f"glide.json: version {theme.get('version')} but PIN.json says {p['theme']['version']}")
    return problems


def reader(upstream: str):
    """Bytes of a repo path in ``upstream``: an ephemeral-ui checkout, or a git ref fetched from GitHub."""
    root = Path(upstream)
    if root.is_dir():
        return lambda path: (root / path).read_bytes()

    def fetch(path: str) -> bytes:
        url = f"https://raw.githubusercontent.com/{REPO}/{upstream}/{path}"
        with urllib.request.urlopen(url, timeout=30) as r:  # noqa: S310 - fixed https host
            return r.read()
    return fetch


def check_upstream(p: dict, read) -> list[str]:
    """Problems against upstream: a theme file that changed since the pin, a catalog with new kinds."""
    problems = []
    for path, want in p["files"].items():
        got = sha256(read(path))
        if got != want:
            problems.append(f"{path}: upstream changed since {p['sha'][:7]} (stale pin): re-vendor with --vendor")
    catalog = json.loads(read(CATALOG))
    kinds = [k["kind"] for k in catalog["kinds"]]
    new = sorted(set(kinds) - set(p["catalog"]["kinds"]))
    gone = sorted(set(p["catalog"]["kinds"]) - set(kinds))
    if new:
        problems.append(f"catalog: {len(new)} kind(s) not covered by the pin: {', '.join(new)}")
    if gone:
        problems.append(f"catalog: {len(gone)} pinned kind(s) gone upstream: {', '.join(gone)}")
    if catalog["version"] != p["catalog"]["version"]:
        problems.append(f"catalog: version {catalog['version']} upstream, {p['catalog']['version']} pinned (stale pin)")
    return problems


def vendor(src: Path) -> dict:
    sha = subprocess.run(["git", "-C", str(src), "rev-parse", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()
    SHARED.mkdir(parents=True, exist_ok=True)
    for path in FILES:
        shutil.copyfile(src / path, local(path))
    theme = json.loads((src / FILES[0]).read_text())
    catalog = json.loads((src / CATALOG).read_text())
    p = {
        "repo": REPO,
        "sha": sha,
        "files": {path: sha256((src / path).read_bytes()) for path in FILES},
        "theme": {"version": theme["version"]},
        "catalog": {"version": catalog["version"], "sha256": sha256((src / CATALOG).read_bytes()),
                    "kinds": [k["kind"] for k in catalog["kinds"]]},
    }
    PIN.write_text(json.dumps(p, indent=2) + "\n")
    return p


def main(argv: list[str]) -> int:
    if argv[:1] == ["--vendor"] and len(argv) == 2:
        p = vendor(Path(argv[1]))
        print(f"vendored {REPO}@{p['sha'][:7]}: theme {p['theme']['version']}, catalog {p['catalog']['version']} ({len(p['catalog']['kinds'])} kinds)")
        return 0
    p = pin()
    problems = check_copy(p)
    where = "pin"
    if argv[:1] == ["--upstream"] and len(argv) == 2:
        problems += check_upstream(p, reader(argv[1]))
        where = f"pin and upstream {argv[1]}"
    elif argv:
        print(__doc__, file=sys.stderr)
        return 2
    for problem in problems:
        print(f"shared theme: {problem}")
    if problems:
        return 1
    print(f"shared theme: {REPO}@{p['sha'][:7]} theme {p['theme']['version']}, catalog {p['catalog']['version']} "
          f"({len(p['catalog']['kinds'])} kinds) matches the {where}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

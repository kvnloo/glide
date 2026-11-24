#!/usr/bin/env python3
"""Build the offline field guide from a Git ref, never from the working tree."""
import argparse
import base64
from collections import OrderedDict
from datetime import date
from html import escape
from io import BytesIO
from pathlib import Path, PurePosixPath
import re
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUTPUT = ROOT / "docs/evolution/glide-evolution.html"
LIMIT = 25_000_000
CSP = (
    "default-src 'none'; img-src data:; style-src 'unsafe-inline'; "
    "base-uri 'none'; form-action 'none'"
)
# Editorial captions supplement, rather than select or replace, the generated ledger.
NOTES = {
    "2026-W42": ("A frontend becomes a workspace",
                 "The Tern frontend ships as a Hermes plugin. Chat gains session navigation, "
                 "live subagent transcripts and controls for queued work."),
    "2026-W43": ("Work moves beside the chat",
                 "Pull requests, files and terminals open in adjacent blocks. Long-running "
                 "jobs gain charts, and sessions can resume after a pane dies."),
    "2026-W44": ("The parity pass",
                 "Nightly integration closes gaps around tool failures, retained output and "
                 "shortcut ownership. Frontend channels make it possible to switch builds in-pane."),
    "2026-W45": ("Separating the upstream story",
                 "The upstream README is restored; fork-specific documentation moves into FORK.md."),
    "2026-W46": ("One install, now Glide",
                 "Glide and the Tern frontend become one plugin. Corrections memory, attention "
                 "controls, council, voice lanes and composer widgets add a new workspace layer."),
    "2026-W47": ("A workspace that shows its work",
                 "The landing page ships. Agent lineage, tool progress and a gigapixel "
                 "viewer land as the timing contract brings card motion into line."),
}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def safe(value):
    """Keep source text literal; omit incidental URLs, addresses and home paths."""
    value = re.sub(r"https?://[^\s<>]+|/(?:Users|home)/[^\s<>]+", "[redacted]", value)
    value = re.sub(r"\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b|\b(?:\d{1,3}\.){3}\d{1,3}\b",
                   "[redacted]", value)
    return escape(value, quote=True)


def commits(*revs, first_parent=False):
    args = ["log", "--reverse", "-z", "--format=%H%x1f%cs%x1f%P%x1f%s%x1f%b"]
    if first_parent:
        args.append("--first-parent")
    for record in git(*args, *revs, "--").decode(errors="replace").split("\0"):
        if record:
            yield record.split("\x1f", 4)


def pr_title(subject, body):
    merge = re.match(r"Merge pull request #(\d+)\b", subject)
    if merge:
        title = next((line.strip() for line in body.splitlines() if line.strip()), "")
        return merge[1], title or "Merge pull request"
    squash = re.search(r"\(#(\d+)\)$", subject)
    if squash:
        return squash[1], subject[:squash.start()].strip()
    return None


def image_path(path):
    return (path.startswith(("docs/", "glide/docs/", "glide/proofs/"))
            and not path.startswith("docs/evolution/")
            and PurePosixPath(path).suffix.lower() in {".png", ".jpeg", ".jpg", ".webp"}
            and not PurePosixPath(path).name.endswith("-reference.png"))


def doc_path(path):
    return (path in {"README.md", "FORK.md"} or
            (path.startswith(("docs/", "glide/docs/", "frontend/docs/"))
             and not path.startswith("docs/evolution/") and path.lower().endswith(".md")) or
            PurePosixPath(path).name.upper().startswith("CHANGELOG"))


def changed(commit, kind):
    raw = git("diff-tree", "--root", "--first-parent", "-m", "--no-commit-id", "-r",
              "--no-renames", "--diff-filter=" + kind, "--name-only", "-z", commit)
    return filter(None, raw.decode(errors="replace").split("\0"))


def period(day):
    year, week, _ = date.fromisoformat(day).isocalendar()
    return f"{year}-W{week:02}"


def inline_image(commit, path, width):
    with Image.open(BytesIO(git("show", f"{commit}:{path}"))) as image:
        image.thumbnail((width, width), Image.Resampling.LANCZOS)
        image = image.convert("RGBA" if "A" in image.getbands() or "transparency" in image.info
                              else "RGB")
        blob = BytesIO()
        image.save(blob, "WEBP", quality=79)
    return base64.b64encode(blob.getvalue()).decode("ascii")


def heading(content, path):
    if content:
        match = re.search(r"^# +(.+)$", content, re.MULTILINE)
        if match:
            return match[1]
    return PurePosixPath(path).name


def read_docs(commit, path):
    result = subprocess.run(["git", "show", f"{commit}:{path}"], cwd=ROOT,
                            capture_output=True)
    return result.stdout.decode(errors="replace") if result.returncode == 0 else ""


def intro(commit):
    readme = read_docs(commit, "README.md")
    # Current README opens with a plain-language product description after H1.
    match = re.search(r"^# .+\n\s*\n([^#<!\n][^\n]+)", readme, re.MULTILINE)
    if not match:
        return "An offline record of the Glide repository."
    return re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", match[1])


def collect(ref):
    trunk = list(commits(ref, first_parent=True))
    eras = []
    seen_images = set()
    for commit, day, parents, subject, body in trunk:
        week = period(day)
        if not eras or eras[-1]["week"] != week:
            eras.append(dict(week=week, first=day, last=day, tip=commit,
                             docs={}, images=[], prs={}, merges=[], features=[]))
        era = eras[-1]
        era.update(last=day, tip=commit)
        pr = pr_title(subject, body)
        if pr:
            era["prs"][pr[0]] = (pr[1], commit)
        elif len(parents.split()) > 1:
            era["merges"].append((subject, commit))
        if subject.startswith("feat"):
            era["features"].append((subject, commit))
        for path in changed(commit, "AM"):
            if doc_path(path):
                era["docs"][path] = commit
        for path in changed(commit, "A"):
            if image_path(path) and path not in seen_images:
                seen_images.add(path)
                era["images"].append((path, commit))

    # Map tags and side-branch commits to the week they became reachable on main.
    tags = {}
    for tag in git("tag", "--merged", ref).decode().splitlines():
        target = git("rev-parse", f"refs/tags/{tag}^{{commit}}").decode().strip()
        tags.setdefault(target, []).append(tag)
    prev = None
    for era in eras:
        history = list(commits(era["tip"], *([f"^{prev}"] if prev else [])))
        era["history"] = history
        ids = [row[0] for row in history]
        era["tags"] = [(tag, commit) for commit in ids for tag in tags.get(commit, ())]
        # When an era is mostly merges, use features on the merged branches for highlights.
        if not era["features"]:
            era["features"] = [(row[3], row[0]) for row in history if row[3].startswith("feat")]
        prev = era["tip"]
    return trunk, eras


def log_list(rows):
    return "<ul class='log'>" + "".join(
        f"<li><code>{commit[:8]}</code><span>{safe(title)}</span></li>"
        for title, commit in rows
    ) + "</ul>"


def details(label, contents):
    return f"<details><summary>{label}</summary>{contents}</details>"


def render_era(era, index, width):
    week = era["week"]
    key = f"era-{index}"
    title, note = NOTES.get(week, (f"Week {week.split('W')[1]}", ""))
    dates = era["first"] if era["first"] == era["last"] else f"{era['first']} — {era['last']}"
    highlights = list(OrderedDict.fromkeys((*era["features"][:2], *era["features"][-3:])))
    prs = [(f"#{num} · {name}", commit) for num, (name, commit) in era["prs"].items()]
    merges = prs + era["merges"]
    docs = log_list((f"{heading(read_docs(commit, path), path)} · {path}", commit)
                    for path, commit in sorted(era["docs"].items()))
    history = log_list((f"{day} · {subject}", commit)
                       for commit, day, _, subject, _ in era["history"])
    images = []
    for path, commit in era["images"]:
        label = safe(PurePosixPath(path).stem.replace("-", " "))
        images.append(
            f'<figure><img src="data:image/webp;base64,{inline_image(commit, path, width)}" '
            f'alt="{label}"><figcaption>{label} <code>{commit[:8]}</code></figcaption></figure>'
        )
    gallery = ('<div class="gallery">' + ''.join(images) + '</div>' if images else
               '<p class="empty">No new project captures recorded in this era.</p>')
    tag_line = ("<p class='empty'>Tags: " + ", ".join(
        f"{safe(tag)} <code>{commit[:8]}</code>" for tag, commit in era["tags"]
    ) + "</p>") if era["tags"] else ""
    return f"""
    <section id="{key}" class="era">
      <header>
        <p class="kicker">Era {index:02} <span> / </span> {dates}</p>
        <h2>{safe(title)}</h2>
        <p>{safe(note)}</p>
      </header>
      <p class="metrics">{len(era['history'])} commits · {len(prs)} identified PRs · {len(images)} captures</p>
      {log_list(highlights) if highlights else ""}
      {gallery}
      {tag_line}
      {details(f'Merges &amp; pull requests ({len(merges)})', log_list(merges)) if merges else ""}
      {details(f'Documentation &amp; changelogs ({len(era["docs"])})', docs) if era["docs"] else ""}
      {details(f'Commit ledger ({len(era["history"])})', history)}
    </section>"""


def render(trunk, eras, width):
    head = trunk[-1][0]
    nav = "".join(
        f'<a href="#era-{index}"><b>{index:02}</b> {safe(NOTES.get(e["week"], (e["week"],))[0])}</a>'
        for index, e in enumerate(eras, 1)
    )
    count = sum(len(e["history"]) for e in eras)
    tag_count = sum(len(e["tags"]) for e in eras)
    styles = (HERE / "evolution.css").read_text()
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glide — An evolution in {len(eras)} eras</title>
<style>{styles}</style>
</head>
<body>
<main>
  <header class="cover">
    <p class="kicker">Project archive <span> / </span> Offline edition</p>
    <h1>Glide<span>.</span></h1>
    <p class="deck">An evolution in {len(eras)} eras</p>
    <p class="intro">{safe(intro(head))}</p>
    <dl class="stats">
      <div><dt>Reachable commits</dt><dd>{count:,}</dd></div>
      <div><dt>First commit</dt><dd>{trunk[0][1]}</dd></div>
      <div><dt>Snapshot</dt><dd>{trunk[-1][1]} <code>{head[:8]}</code></dd></div>
    </dl>
  </header>
  <nav aria-label="Jump to an era">{nav}</nav>
  {''.join(render_era(era, index, width) for index, era in enumerate(eras, 1))}
  <footer>
    <p>Provenance: snapshot <code>{head}</code>. Weeks follow the first-parent
    committer dates; side-branch commits are filed where they became reachable.
    PR labels come from merge and squash messages. Reachable tags: {tag_count}.</p>
    <p>Capture dates reflect first appearance on the mainline, not when an image
    was taken. Captures are downscaled from tracked project docs and proofs;
    comparison reference images are excluded. This archive does not run the app.</p>
  </footer>
</main>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", default="origin/main", help="Git ref or commit to document")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    snapshot = git("rev-parse", "--verify", "--end-of-options", args.ref + "^{commit}").decode().strip()
    trunk, eras = collect(snapshot)
    for width in (1000, 700, 480, 320):
        html = render(trunk, eras, width)
        content = ("\n".join(line.rstrip() for line in html.splitlines()) + "\n").encode()
        if len(content) < LIMIT:
            break
    else:
        raise SystemExit(f"Archive exceeds {LIMIT:,} bytes even at {width}px")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(content)
    print(f"{len(content)} bytes; {len(eras)} eras; "
          f"{sum(len(e['history']) for e in eras)} commits; "
          f"{sum(len(e['images']) for e in eras)} captures; "
          f"{sum(len(e['tags']) for e in eras)} reachable tags; snapshot {snapshot[:8]}")


if __name__ == "__main__":
    main()

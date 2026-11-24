# Glide evolution archive

Open [glide-evolution.html](glide-evolution.html) as a local file in a browser.
It is a field guide to Glide's history, not a runnable copy of the plugin.
Each era has a summary, any newly tracked project captures, and expandable lists
of commits, merges/PRs and documentation changes. The
[full-page browser capture](glide-evolution.png) shows the default collapsed view.

## Rebuild and verify

From the repo root, with full Git history and up-to-date `origin/main` and tags:

```sh
python3 -m venv .venv-evolution
. .venv-evolution/bin/activate
python -m pip install -r scripts/evolution/requirements.txt
python -m playwright install chromium
python scripts/evolution/build_evolution_html.py
python scripts/evolution/test_evolution_html.py --screenshot docs/evolution/glide-evolution.png
```

Pass `--ref <sha>` to reproduce a historical snapshot, or `--chromium <executable>`
to verify using a system Chromium/Chrome instead of Playwright's browser.
Setup may require internet access; the generated file does not. The verification
copies it to an empty directory, then loads it with Chromium offline and
non-document requests intercepted. The run fails on requests or browser errors,
checks that every embedded image decoded, and exercises the navigation and ledger.

The generator indexes the commit graph and uses the mainline integration week
for grouping, not the author dates of branch commits. Editorial era notes live
in the generator; the commit, PR, docs, tag and image listings are rebuilt from
Git. Only tags reachable from the snapshot are listed, and only tracked
project docs/proof images are embedded. The size budget is 25 MB.

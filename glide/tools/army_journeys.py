#!/usr/bin/env python3
"""TesterArmy journey run: every features.json journey, headless, with one receipt per feature.

    python3 glide/tools/army_journeys.py --out DIR [--host-python PY] [--pytest CMD] [--vitest CMD]

Each run tests one clean commit. It builds a disposable fixture host (private HOME, HERMES_HOME,
TMPDIR and XDG dirs, no inherited HERMES_* or Tern variables) and runs, in it:

1. The suites every feature names: root pytest, glide/tests, Vitest and the OpenUI preview's node
   tests, with JUnit output.
2. The frontend journey drive (``frontend/src/__tests__/armyJourneys.test.ts``, inside Vitest): each
   typed entry submitted to the real App on a fake Tern session, its plugin calls answered by the
   real plugin through ``army_host.py serve``.
3. The plugin drive below: CLI subcommands, text commands, gateway methods, tools and hooks called
   through what ``register(ctx)`` registered, in journey order in one fixture profile.

A feature passes only when every test file it names ran at least one test and none failed, and every
drive step it has passed. A feature with no typed entry or plugin call (an event-driven card or pane)
rests on its fixture suites alone; its receipt says so (``mode: suite``). Receipts are written to
``DIR/receipts/<journey>.json`` in the shape ``frontend/scripts/features-gate.mjs --strict`` reads, and
the gate's strict verdict is run against them. Exit 0 only when every feature passed and the gate did.
"""

from __future__ import annotations

import argparse
import ast
import datetime as _dt
import json
import os
import re
import shlex
import sqlite3
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HOST = ROOT / "glide" / "tools" / "army_host.py"
INVENTORIES = ("frontend/e2e/features.json", "frontend/e2e/features.intel.json")
MANIFEST = ROOT / "plugin.yaml"
SUITE_TIMEOUT_S = 1800  # one suite, start to JUnit
SHELL_TIMEOUT_S = 120  # one shipped CLI call in the plugin drive
TIMED_OUT = 124  # the exit code `timeout(1)` reports, for a suite this runner stopped
REPLY_CHARS = 600  # how much of a step's reply a receipt keeps

# Plugin-side steps per feature: (op, request, expectation). `expect` keys: `exit` (CLI exit code),
# `match` (regex over the reply), `absent` (gateway method that must NOT be registered by default).
S = "army-s1"
PLUGIN_DRIVES: dict[str, list[tuple[str, dict, dict]]] = {
    "install-plugin": [
        ("manifest", {}, {}),
        ("cli", {"name": "tern"}, {"match": r"--channel"}),
        ("cli", {"name": "glide"}, {"match": r"onboard"}),
        ("command", {"name": "glide", "arg": "help"}, {"match": r"/glide build"}),
    ],
    "tern-launch": [("cli_run", {"name": "tern", "argv": []},
                     {"exit": 1, "match": r"did not answer the Tern Surface Protocol"})],
    "glide-launch": [("cli", {"name": "glide"}, {"match": r"usage: hermes glide"})],
    "glide-onboard-cli": [("cli_run", {"name": "glide", "argv": ["onboard", "--json"]},
                           {"exit": 0, "match": r'"id": "history",\s+"ok": true'})],
    "frontend-channels": [
        ("cli", {"name": "tern"}, {"match": r"--channel"}),
        ("cli_run", {"name": "tern", "argv": ["switch", "main"]}, {"match": r"[Tt]ern pane|TERN_PANE|channel"}),
    ],
    "glide-detect": [("gateway", {"method": "glide.detect", "params": {}}, {"match": r'"cpus"'}),
                     ("command", {"name": "glide", "arg": "--help"}, {"match": r"/glide recall"})],
    "memory-build": [("gateway", {"method": "glide.sync", "params": {"limit": 5}}, {"match": r'"corrections": 2'}),
                     ("command", {"name": "glide", "arg": "build"}, {"match": r"Memory up to date"})],
    "memory-enable": [("command", {"name": "glide", "arg": "on"}, {"match": r"Glide memory is on"})],
    "memory-hook": [("hook", {"name": "pre_llm_call", "kwargs": {"user_message": "push the branch to main"}},
                     {"match": r"never push to main without running the tests"}),
                    ("hook", {"name": "pre_llm_call", "kwargs": {"user_message": "the weather"}}, {"match": r"^\[null\]$"})],
    "memory-recall": [("gateway", {"method": "glide.recall", "params": {"query": "push to main"}}, {"match": r"never push to main"}),
                      ("command", {"name": "glide", "arg": "recall pnpm frontend"}, {"match": r"use pnpm for the frontend"})],
    "memory-disable": [("gateway", {"method": "glide.enable", "params": {"on": False}}, {"match": r'"on": false'}),
                       ("command", {"name": "glide", "arg": "off"}, {"match": r"Glide memory is off"})],
    "glide-setup": [("command", {"name": "glide", "arg": "setup"}, {"match": r"history"})],
    "glide-json-fallback": [("command", {"name": "glide", "arg": "json detect {}"}, {"match": r'"cpus"'})],
    "router-card": [("gateway", {"method": "glide.skill_router", "params": {}}, {"match": r'"categories"'})],
    "router-install": [("command", {"name": "glide", "arg": "skill-router install --force"}, {"match": r"[Ii]nstall"})],
    "router-list": [("command", {"name": "glide", "arg": "skill-router list"}, {"match": r"Skill Router Categories"})],
    "router-rank": [("command", {"name": "glide", "arg": "skill-router rank debug a failing test"}, {"match": r"debugging"})],
    "hill-climb-card": [("gateway", {"method": "glide.hill_climb", "params": {"run": False}}, {"match": r"scaffold|verdict|round"})],
    "hill-climb-scaffold": [("command", {"name": "glide", "arg": "hill-climb scaffold --force"}, {"match": r"Hill climb scaffolded"})],
    "hill-climb-run": [("command", {"name": "glide", "arg": "hill-climb run --samples 2"}, {"match": r"^Hill Climb Round \d+"})],
    "hill-climb-status": [("command", {"name": "glide", "arg": "hill-climb status"}, {"match": r"Rounds:\s+[1-9]"}),
                          ("gateway", {"method": "glide.hill_climb", "params": {"run": False}}, {"match": r"verdict|round"})],
    "hill-climb-stop-resume": [("command", {"name": "glide", "arg": "hill-climb stop"}, {"match": r"STOP file created"}),
                               ("command", {"name": "glide", "arg": "hill-climb run"}, {"match": r"^Round failed"}),
                               ("command", {"name": "glide", "arg": "hill-climb resume"}, {"match": r"STOP file removed"})],
    "offload-card": [("gateway", {"method": "glide.offload", "params": {"run": False}}, {"match": r"local_models|tasks"})],
    "offload-models": [("command", {"name": "glide", "arg": "offload models"}, {"match": r"local model|ollama"})],
    "offload-task": [("command", {"name": "glide", "arg": "offload summarize army fixture text"}, {"match": r"local model|ollama|Offload"})],
    "offload-savings": [("command", {"name": "glide", "arg": "offload savings"}, {"match": r"[Oo]ffload|savings|No offload"})],
    "offload-reset": [("command", {"name": "glide", "arg": "offload reset"}, {"match": r"^Offload tracking reset\.$"})],
    "focus-status": [("gateway", {"method": "glide.focus", "params": {"action": "show"}}, {"match": r"phase|block"})],
    "focus-hours": [("command", {"name": "glide", "arg": "focus hours"}, {"match": r"\S"})],
    "focus-start": [("gateway", {"method": "glide.focus", "params": {"action": "start", "minutes": 25}}, {"match": r'"block": \{"until": "\d\d:\d\d", "minutes_left": 25'})],
    "focus-route": [("gateway", {"method": "glide.route", "params": {"title": "army report", "body": "held", "cls": "report"}}, {"match": r'"deliver": false|"queued": [1-9]'}),
                    ("gateway", {"method": "glide.route", "params": {"title": "army critical", "cls": "critical"}}, {"match": r'"deliver": true'})],
    "focus-stop": [("gateway", {"method": "glide.focus", "params": {"action": "stop"}}, {"match": r"army report|held|released|digest"})],
    "focus-wind-down": [("gateway", {"method": "glide.focus", "params": {"action": "wind_down"}}, {"match": r"\S"})],
    "focus-morning-resume": [("hook", {"name": "pre_llm_call", "kwargs": {"user_message": "good morning"}}, {"match": r"^\["})],
    "talk-call": [("command", {"name": "tern-talk", "arg": "status army-call"}, {"match": r"\S"})],
    "taste-pane": [("gateway", {"method": "glide.taste", "params": {}}, {"refusal": r"Taste Atlas is unavailable"})],
    "pr-link-tools": [("tool", {"name": "list_pull_requests", "args": {}}, {"match": r'"linked": \[\]'}),
                      ("tool", {"name": "link_pull_request", "args": {}}, {"match": r"error|url|number|repo"})],
    "ask-control": [("tool", {"name": "ask_control", "args": {"id": "army", "kind": "confirm", "prompt": "Ship it?"}},
                     {"match": r"No hermes tern pane shows this chat"})],
    "whole-theme": [("tool", {"name": "glide_theme", "args": {"theme": "sepia"}}, {"match": r"\S"})],
    "mcp-reports": [("gateway", {"method": "glide.operations.report", "params": {"view": "mcp-list"}}, {"match": r"\S"})],
    "ssh-report": [("gateway", {"method": "glide.operations.report", "params": {"view": "ssh-list"}}, {"match": r"\S"})],
    "plan-review-boundary": [("gateway", {"method": "glide.plan.status", "params": {}}, {"match": r"\S"})],
    # Browser blocks and pods need a live browser profile or a known cluster node: the fixture gets the visible refusal.
    "browser-blocks": [("gateway", {"method": "glide.browser.blocks", "params": {}}, {"refusal": r"browser profile scope"})],
    "media-preview-gateway": [("gateway", {"method": "glide.media.image", "params": {"path": "/nonexistent/army.png"}},
                               {"refusal": r"[Ii]mage|refus|outside|not"})],
    "table-gateway-boundary": [("absent", {"method": "glide.table.policy"}, {}), ("absent", {"method": "glide.table.plan"}, {})],
    "fleet-hosts": [("gateway", {"method": "glide.fleet", "params": {"view": "hosts"}}, {"match": r"\S"})],
    "fleet-portfolio": [("gateway", {"method": "glide.fleet", "params": {"view": "portfolio"}}, {"match": r"\S"})],
    "fleet-factory": [("gateway", {"method": "glide.fleet", "params": {"view": "factory"}}, {"match": r"\S"})],
    "fleet-pods": [("gateway", {"method": "glide.fleet_pod", "params": {"host": "atlas", "ns": "default", "name": "army"}},
                    {"refusal": r"not on the requested known cluster node"})],
    "intel-stock-command": [("command", {"name": "intel", "arg": "--json hill"}, {"match": r'"kind": "intel-suite"'})],
    "intel-boundaries-ownership": [("command", {"name": "intel", "arg": "bogus"}, {"match": r"^/intel \[--json\]"})],
    # The shipped OpenUI CLI, on a synthetic card.v0 document written into the fixture home.
    "prepare-card-preview": [("shell", {"argv": ["node", "frontend/openui/prepare.mjs", "prepare-card", "{home}/card.json",
                                                 '["army-session","main"]', "{home}/prepared", "--json"],
                                        "files": {"card.json": json.dumps({
                                            "kind": "thread", "app": "gmail", "title": "Synthetic thread", "subject": "Invoice 42",
                                            "summary": "Synthetic due date", "fields": {"Sender": "Sample person"},
                                            "actions": "host-confirmed", "buttons": ["Dismiss"]})}},
                              {"exit": 0, "match": r'"id": ?"[^"]+".*"path": ?"[^"]+"|"path": ?"[^"]+".*"id": ?"[^"]+"'})],
    "background-live-charts": [("registered", {"kind": "rpc", "name": "charts.author"}, {}),
                               ("registered", {"kind": "aux", "name": "tern_charts"}, {})],
    "reply-figures": [("registered", {"kind": "rpc", "name": "figures.check"}, {})],
    "table-charts": [("registered", {"kind": "aux", "name": "table_charts"}, {})],
}


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", str(ROOT), *args], check=True, capture_output=True, text=True).stdout.strip()


def features() -> list[dict]:
    rows: list[dict] = []
    for path in INVENTORIES:
        rows += json.loads((ROOT / path).read_text())["features"]
    return rows


def journey_order() -> list[str]:
    text = (ROOT / "frontend/e2e/JOURNEYS.md").read_text()
    order: list[str] = []
    for line in text.splitlines():
        found = re.match(r"^\d+\. `([a-z][a-z0-9-]*)`", line)
        if found:
            order.append(found.group(1))
    return order


def fixture_env(base: Path, extra: dict[str, str] | None = None) -> dict[str, str]:
    """A private profile: nothing from the owner's environment except PATH and the locale."""
    home = base / "home"
    env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"), "LANG": os.environ.get("LANG", "C.UTF-8"),
        "HOME": str(home), "TMPDIR": str(base / "tmp"), "HERMES_HOME": str(base / "hermes"),
        "XDG_CONFIG_HOME": str(home / ".config"), "XDG_CACHE_HOME": str(home / ".cache"),
        "XDG_DATA_HOME": str(home / ".local/share"), "XDG_STATE_HOME": str(home / ".local/state"),
        "PI_CODING_AGENT_DIR": str(base / "omp-agent"), "HERMES_TERN_CHANNELS": str(base / "tern-channels/channels.json"),
        "GLIDE_ARMY_FIXTURE": "1", "TERM": "dumb", "NO_COLOR": "1",
    }
    for key in ("HOME", "TMPDIR", "HERMES_HOME"):
        Path(env[key]).mkdir(parents=True, exist_ok=True)
    env.update(extra or {})
    return env


def run(cmd: list[str], cwd: Path, env: dict[str, str], log: Path, timeout: int = SUITE_TIMEOUT_S) -> int:
    with log.open("w") as out:
        out.write("$ " + shlex.join(cmd) + f"\n# cwd: {cwd.relative_to(ROOT) if cwd != ROOT else '.'}\n")
        out.flush()
        try:
            return subprocess.run(cmd, cwd=cwd, env=env, stdout=out, stderr=subprocess.STDOUT, timeout=timeout).returncode
        except subprocess.TimeoutExpired:
            out.write(f"\n# timed out after {timeout}s\n")
            return TIMED_OUT


def junit_cases(path: Path, prefix: str, key: str, strip: str = "") -> dict[str, dict[str, int]]:
    """{repo-relative test file: {passed, failed, skipped}} from one JUnit report."""
    files: dict[str, dict[str, int]] = {}
    if not path.is_file():
        return files
    for case in ET.parse(path).getroot().iter("testcase"):
        name = case.get(key) or ""
        if not name:
            continue
        rel = prefix + name.replace("\\", "/").removeprefix(strip)
        tally = files.setdefault(rel, {"passed": 0, "failed": 0, "skipped": 0})
        tags = {child.tag for child in case}
        if tags & {"failure", "error"}:
            tally["failed"] += 1
        elif "skipped" in tags:
            tally["skipped"] += 1
        else:
            tally["passed"] += 1
    return files


def seed_history(home: Path) -> None:
    """Two local sessions with corrections (and a cron one without), in the sessions/messages schema the
    memory suite defines once (``glide/tests/test_memory.py``: SCHEMA), read without importing the suite."""
    tree = ast.parse((ROOT / "glide/tests/test_memory.py").read_text())
    schema = next(ast.literal_eval(node.value) for node in tree.body if isinstance(node, ast.Assign)
                  and any(isinstance(t, ast.Name) and t.id == "SCHEMA" for t in node.targets))
    home.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(home / "state.db")
    db.executescript(schema)
    db.executemany("INSERT INTO sessions (id, source, started_at) VALUES (?, ?, ?)",
                   [("old", "cli", 1.0), ("new", "tui", 2.0), ("cron-job", "cron", 3.0)])
    for sid, text in [("old", "Correction: never push to main without running the tests"),
                      ("new", "actually, use pnpm for the frontend, not npm"),
                      ("new", "please write the release notes"),
                      ("cron-job", "no, this cron text is not a local correction")]:
        db.execute("INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, 'user', ?, 2.0)", (sid, text))
    db.commit()
    db.close()


def _manifest_step(inventory: dict, _request: dict, _expect: dict, _env: dict) -> dict:
    """The manifest's declared tools and hooks are exactly the registered ones, and one install gives both CLIs and /glide."""
    manifest = MANIFEST.read_text()
    declared = {key: sorted(re.findall(r"[a-z_]+", re.search(rf"^{key}: \[(.*)\]$", manifest, re.M).group(1)))
                for key in ("provides_tools", "provides_hooks")}
    got = {"provides_tools": inventory.get("tools", []), "provides_hooks": inventory.get("hooks", [])}
    ok = declared == got and {"tern", "glide"} <= set(inventory.get("cli", [])) and "glide" in inventory.get("commands", [])
    return {"ok": ok, "detail": {"declared": declared, "registered": got, "cli": inventory.get("cli"), "commands": inventory.get("commands")}}


def _absent_step(inventory: dict, request: dict, _expect: dict, _env: dict) -> dict:
    ok = request["method"] not in inventory.get("gateway", [])
    return {"ok": ok, "detail": "not registered by default" if ok else "registered without explicit opt-in"}


def _registered_step(inventory: dict, request: dict, _expect: dict, _env: dict) -> dict:
    ok = request["name"] in inventory.get(request["kind"], [])
    return {"ok": ok, "detail": f"{request['kind']} {request['name']} registered" if ok else "missing"}


def _shell_step(_inventory: dict, request: dict, expect: dict, env: dict) -> dict:
    """A shipped CLI run from the repository root, its input files written into the fixture home."""
    home = Path(env["HOME"])
    for name, content in request.get("files", {}).items():
        (home / name).write_text(content)
    argv = [a.replace("{home}", str(home)) for a in request["argv"]]
    done = subprocess.run(argv, cwd=ROOT, env=env, capture_output=True, text=True, timeout=SHELL_TIMEOUT_S)
    text = (done.stdout + done.stderr).strip()
    ok = done.returncode == expect.get("exit", 0) and re.search(expect.get("match", r"\S"), text, re.S) is not None
    return {"ok": ok, "exit": done.returncode, "reply": text[:REPLY_CHARS], "argv": argv}


LOCAL_STEPS = {"manifest": _manifest_step, "absent": _absent_step, "registered": _registered_step, "shell": _shell_step}


def _host_step(reply: dict, expect: dict) -> dict:
    """A fixture-host reply against its expectation: a matching answer, or the listed visible refusal."""
    text = json.dumps(reply.get("result"), default=str) if "result" in reply else str(reply.get("output", ""))
    text = text if text not in ("", "None") else str(reply.get("stdout", ""))
    if "exit" in reply:
        text = str(reply.get("stdout", "")) + str(reply.get("exit"))
    step: dict = {}
    if expect.get("refusal"):
        ok = not reply.get("ok") and re.search(expect["refusal"], str(reply.get("error", ""))) is not None
        step["refused"] = reply.get("error")
    else:
        ok = bool(reply.get("ok")) and ("exit" not in expect or reply.get("exit") == expect["exit"])
        ok = ok and (not expect.get("match") or re.search(expect["match"], text, re.M) is not None)
        if not reply.get("ok"):
            step["error"] = str(reply.get("error", ""))[:REPLY_CHARS]
    return {**step, "ok": ok, "reply": (text or str(reply.get("error", "")))[:REPLY_CHARS]}


def plugin_drive(host_python: str, env: dict[str, str], order: list[str], log: Path) -> dict[str, list[dict]]:
    """Every plugin step, in journey order, through one fixture-host process, over seeded local history."""
    seed_history(Path(env["HERMES_HOME"]))
    proc = subprocess.Popen([host_python, str(HOST), "serve"], cwd=env["HOME"], env=env, text=True,
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log.open("w"))

    def ask(request: dict) -> dict:
        proc.stdin.write(json.dumps(request) + "\n")
        proc.stdin.flush()
        line = proc.stdout.readline()
        return json.loads(line) if line else {"ok": False, "error": "fixture host exited"}

    inventory = ask({"op": "inventory"}).get("result") or {}
    results: dict[str, list[dict]] = {}
    for feature in order:
        for op, request, expect in PLUGIN_DRIVES.get(feature, []):
            local = LOCAL_STEPS.get(op)
            outcome = local(inventory, request, expect, env) if local else _host_step(ask({"op": op, **request}), expect)
            results.setdefault(feature, []).append({"op": op, **request, **outcome})
    proc.stdin.close()
    proc.wait(timeout=60)
    return results


def judge(row: dict, executed: dict[str, dict[str, int]], ui: dict | None, plugin: list[dict]) -> tuple[dict, str, list[str]]:
    """One feature's evidence: per-file test tallies, which drives ran, and every reason it fails."""
    empty = {"passed": 0, "failed": 0, "skipped": 0}
    tests = {ref: executed.get(ref, empty) for ref in row["tests"]}
    reasons = [f"{ref}: {t['failed']} failed" for ref, t in tests.items() if t["failed"]]
    reasons += [f"{ref}: no test ran" for ref, t in tests.items() if not t["passed"] and not t["failed"]]
    if not tests:
        reasons.append("no test file named")
    if ui is not None and not ui["ok"]:
        reasons.append("frontend drive failed")
    reasons += [f"plugin step {s['op']} {s.get('name') or s.get('method') or ''} failed".rstrip() for s in plugin if not s["ok"]]
    mode = "+".join(m for m, on in (("frontend-drive", ui is not None), ("plugin-drive", bool(plugin))) if on) or "suite"
    return tests, mode, reasons


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, required=True, help="run directory (must not exist)")
    ap.add_argument("--host-python", default=sys.executable, help="python with the Hermes test core (pydantic, hermes_cli)")
    ap.add_argument("--pytest", default=None, help="pytest command (default: HOST_PYTHON -m pytest)")
    ap.add_argument("--vitest", default="bun x vitest run", help="vitest command, run in frontend/")
    ap.add_argument("--allow-dirty", action="store_true", help="run on a dirty tree; receipts are then written as fail")
    args = ap.parse_args(argv)

    out = args.out.resolve()
    if out.exists():
        ap.error(f"{out} exists; each run gets a fresh directory")
    dirty = git("status", "--porcelain", "--untracked-files=normal")
    if dirty and not args.allow_dirty:
        print("army: the worktree is dirty; commit first so the receipts name what was tested", file=sys.stderr)
        return 2
    sha = git("rev-parse", "HEAD")
    out.mkdir(parents=True)
    (out / "logs").mkdir()
    started = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    pytest = shlex.split(args.pytest) if args.pytest else [args.host_python, "-m", "pytest"]
    rows = features()
    order = journey_order()
    by_id = {row["id"]: row for row in rows}

    with tempfile.TemporaryDirectory(prefix="glide-army-host-") as scratch:
        base = Path(scratch)
        suites = {
            "root-pytest": run([*pytest, "-q", "-p", "no:cacheprovider", "-o", "junit_family=xunit1",
                                f"--junitxml={out / 'root-pytest.xml'}"], ROOT, fixture_env(base / "root"), out / "logs/root-pytest.log"),
            "glide-pytest": run([*pytest, "-q", "-p", "no:cacheprovider", "-o", "junit_family=xunit1",
                                 f"--junitxml={out / 'glide-pytest.xml'}"], ROOT / "glide", fixture_env(base / "glide"), out / "logs/glide-pytest.log"),
            "vitest": run([*shlex.split(args.vitest), "--reporter=default", "--reporter=junit",
                           f"--outputFile.junit={out / 'vitest.xml'}"], ROOT / "frontend",
                          fixture_env(base / "vitest", {"GLIDE_ARMY_OUT": str(out), "GLIDE_ARMY_PYTHON": args.host_python}),
                          out / "logs/vitest.log"),
            "openui-preview": run(["node", "--test", "--test-reporter=spec", "--test-reporter-destination=stdout",
                                   "--test-reporter=junit", f"--test-reporter-destination={out / 'openui-preview.xml'}",
                                   *sorted(str(p.relative_to(ROOT)) for p in (ROOT / "frontend/openui/openui-preview/test").glob("*.test.mjs"))],
                                  ROOT, fixture_env(base / "openui"), out / "logs/openui-preview.log"),
        }
        drives = plugin_drive(args.host_python, fixture_env(base / "plugin"), order, out / "logs/plugin-host.log")
    (out / "plugin-drives.json").write_text(json.dumps(drives, indent=1))

    executed: dict[str, dict[str, int]] = {}
    executed.update(junit_cases(out / "root-pytest.xml", "", "file"))
    executed.update(junit_cases(out / "glide-pytest.xml", "glide/", "file"))
    executed.update(junit_cases(out / "vitest.xml", "frontend/", "classname"))
    executed.update(junit_cases(out / "openui-preview.xml", "", "file", strip=str(ROOT) + "/"))
    frontend = {}
    if (out / "frontend-drives.json").is_file():
        frontend = {r["feature"]: r for r in json.loads((out / "frontend-drives.json").read_text())["record"]}

    receipts: dict[str, list[dict]] = {}
    for fid in order:
        row = by_id[fid]
        tests, mode, reasons = judge(row, executed, frontend.get(fid), drives.get(fid, []))
        ui, plugin = frontend.get(fid), drives.get(fid, [])
        verdict = "pass" if not reasons and not dirty else "fail"
        if dirty:
            reasons.append("dirty worktree")
        receipts.setdefault(row["journey"], []).append({
            "feature": fid, "sha": sha, "verdict": verdict, "journey": row["journey"], "surface": row["surface"],
            "mode": mode, "run_at": started, "runner": "glide/tools/army_journeys.py",
            "fixture": "headless: fake Tern session + fixture gateway, real plugin via army_host.py, private profile",
            "tests": tests, "frontend_steps": [
                {k: s[k] for k in ("line", "entries", "overlays", "layers", "native", "changed", "refused", "missing") if k in s}
                for s in (ui or {}).get("steps", [])],
            "plugin_steps": plugin, "reasons": reasons,
        })
    (out / "receipts").mkdir()
    for journey, items in receipts.items():
        (out / "receipts" / f"{journey}.json").write_text(json.dumps(items, indent=1) + "\n")

    gate = subprocess.run(["node", "frontend/scripts/features-gate.mjs", "--strict", "--receipts", str(out / "receipts")],
                          cwd=ROOT, capture_output=True, text=True)
    lines = [f"# Army journey run {started}", "", f"Commit `{sha}`. Fixture: private profile, fake Tern session,",
             "fixture gateway with the real plugin behind it. Native Tern pixels are not part of this run.", "",
             "| suite | exit |", "|---|---|", *[f"| {k} | {v} |" for k, v in suites.items()], "",
             "| journey | features | pass | fail | frontend drive | plugin drive | suite only |", "|---|---|---|---|---|---|---|"]
    total = failed = 0
    for journey in dict.fromkeys(by_id[f]["journey"] for f in order):
        items = receipts[journey]
        bad = [r for r in items if r["verdict"] != "pass"]
        total += len(items)
        failed += len(bad)
        count = lambda m: sum(1 for r in items if m in r["mode"])
        lines.append(f"| {journey} | {len(items)} | {len(items) - len(bad)} | {len(bad)} | {count('frontend')} | {count('plugin')} | {count('suite')} |")
    lines += ["", f"Total: {total} features, {total - failed} pass, {failed} fail.", ""]
    for journey, items in receipts.items():
        for r in items:
            if r["verdict"] != "pass":
                lines.append(f"- FAIL `{r['feature']}`: " + "; ".join(r["reasons"]))
    lines += ["", "## features-gate --strict", "", "```", (gate.stdout + gate.stderr).strip(), f"exit {gate.returncode}", "```", ""]
    (out / "SUMMARY.md").write_text("\n".join(lines))
    print("\n".join(lines))
    return 0 if failed == 0 and gate.returncode == 0 and not any(suites.values()) else 1


if __name__ == "__main__":
    sys.exit(main())

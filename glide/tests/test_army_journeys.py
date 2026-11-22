"""The TesterArmy journey runner's own contracts: evidence parsing, isolation and verdicts."""

import importlib.util
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("_army_journeys", ROOT / "glide/tools/army_journeys.py")
army = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(army)


def _junit(tmp_path, body):
    path = tmp_path / "r.xml"
    path.write_text(f"<testsuites><testsuite>{body}</testsuite></testsuites>")
    return path


def test_junit_tallies_pass_fail_and_skip_per_file(tmp_path):
    path = _junit(tmp_path, '<testcase file="tests/test_a.py" name="x"/>'
                            '<testcase file="tests/test_a.py" name="y"><failure/></testcase>'
                            '<testcase file="tests/test_b.py" name="z"><skipped/></testcase>'
                            '<testcase file="tests/test_b.py" name="e"><error/></testcase>')
    assert army.junit_cases(path, "glide/", "file") == {
        "glide/tests/test_a.py": {"passed": 1, "failed": 1, "skipped": 0},
        "glide/tests/test_b.py": {"passed": 0, "failed": 1, "skipped": 1},
    }
    assert army.junit_cases(tmp_path / "missing.xml", "", "file") == {}
    node = _junit(tmp_path, f'<testcase classname="test" file="{army.ROOT}/frontend/x.test.mjs" name="n"/>')
    assert army.junit_cases(node, "", "file", strip=f"{army.ROOT}/") == {
        "frontend/x.test.mjs": {"passed": 1, "failed": 0, "skipped": 0}}


def test_a_feature_passes_only_on_executed_green_tests_and_green_drives():
    row = {"id": "f", "tests": ["a.py", "b.ts"]}
    green = {"a.py": {"passed": 2, "failed": 0, "skipped": 0}, "b.ts": {"passed": 1, "failed": 0, "skipped": 3}}
    assert army.judge(row, green, None, [])[1:] == ("suite", [])
    assert army.judge(row, green, {"ok": True}, [{"op": "gateway", "method": "m", "ok": True}])[1:] == (
        "frontend-drive+plugin-drive", [])
    skipped = {**green, "b.ts": {"passed": 0, "failed": 0, "skipped": 3}}
    assert army.judge(row, skipped, None, [])[2] == ["b.ts: no test ran"]
    assert army.judge(row, {"a.py": green["a.py"]}, None, [])[2] == ["b.ts: no test ran"]
    red = {**green, "a.py": {"passed": 1, "failed": 1, "skipped": 0}}
    assert army.judge(row, red, None, [])[2] == ["a.py: 1 failed"]
    assert army.judge(row, green, {"ok": False}, [])[2] == ["frontend drive failed"]
    assert army.judge(row, green, None, [{"op": "command", "name": "glide", "ok": False}])[2] == [
        "plugin step command glide failed"]
    assert army.judge({"id": "f", "tests": []}, {}, None, [])[2] == ["no test file named"]


def test_the_fixture_profile_inherits_nothing_but_path_and_locale(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_WRITE_SAFE_ROOT", "/owner")
    monkeypatch.setenv("TERN_PANE", "owner-pane")
    env = army.fixture_env(tmp_path)
    assert "HERMES_WRITE_SAFE_ROOT" not in env and "TERN_PANE" not in env
    assert env["GLIDE_ARMY_FIXTURE"] == "1"
    for key in ("HOME", "HERMES_HOME", "TMPDIR", "XDG_CONFIG_HOME", "PI_CODING_AGENT_DIR", "HERMES_TERN_CHANNELS"):
        assert env[key].startswith(str(tmp_path)), key
    assert Path(env["HERMES_HOME"]).is_dir()


def test_every_drive_names_an_inventory_feature_in_journey_order():
    ids = [row["id"] for row in army.features()]
    order = army.journey_order()
    assert sorted(order) == sorted(ids) and len(order) == len(set(order))
    assert set(army.PLUGIN_DRIVES) <= set(ids)


def test_seeded_history_has_two_local_corrections(tmp_path):
    army.seed_history(tmp_path)
    db = sqlite3.connect(tmp_path / "state.db")
    sources = dict(db.execute("SELECT id, source FROM sessions").fetchall())
    assert sources == {"old": "cli", "new": "tui", "cron-job": "cron"}
    assert db.execute("SELECT count(*) FROM messages").fetchone()[0] == 4


def test_the_fixture_host_refuses_to_run_outside_a_fixture_profile(tmp_path):
    env = {"PATH": "/usr/bin:/bin", "HOME": str(tmp_path), "HERMES_HOME": str(tmp_path / "h")}
    done = subprocess.run([sys.executable, str(army.HOST), "inventory"], env=env, capture_output=True, text=True)
    assert done.returncode != 0 and "fixture profile" in done.stderr


def test_receipts_from_a_dirty_tree_are_never_written_as_pass(tmp_path, monkeypatch):
    monkeypatch.setattr(army, "git", lambda *a: " M x" if a[0] == "status" else "0" * 40)
    assert army.main(["--out", str(tmp_path / "run")]) == 2
    assert not (tmp_path / "run").exists()


def test_a_host_reply_passes_on_its_match_or_its_listed_refusal_only():
    assert army._host_step({"ok": True, "output": "Offload tracking reset."}, {"match": r"^Offload tracking reset\.$"})["ok"]
    assert not army._host_step({"ok": True, "output": "something else"}, {"match": r"^Offload"})["ok"]
    assert army._host_step({"ok": True, "exit": 1, "stdout": "not a Tern pane"}, {"exit": 1, "match": "Tern"})["ok"]
    assert not army._host_step({"ok": True, "exit": 0, "stdout": "not a Tern pane"}, {"exit": 1})["ok"]
    refused = {"ok": False, "error": "PermissionError: browser profile scope changed"}
    assert army._host_step(refused, {"refusal": "browser profile scope"})["ok"]
    assert not army._host_step(refused, {"match": r"\S"})["ok"]
    assert not army._host_step({"ok": True, "result": {}}, {"refusal": "anything"})["ok"]

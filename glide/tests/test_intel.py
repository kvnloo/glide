"""Synthetic intel.v0 contracts, stock registration, bounded readers and safe details."""
from copy import deepcopy
import importlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
from types import SimpleNamespace

import pytest


@pytest.fixture
def intel(monkeypatch, tmp_path):
    module = importlib.import_module("glide_plugin.intel")
    module._CACHE.clear()
    monkeypatch.setenv("GLIDE_INTEL_OPS", str(tmp_path / "ops"))
    monkeypatch.setenv("GLIDE_INTEL_CLIMBS", str(tmp_path / "*hillclimb*"))
    monkeypatch.setenv("GLIDE_INTEL_MEMORY_ROOT", str(tmp_path / "memory"))
    monkeypatch.setenv("GLIDE_INTEL_EVENT_LOG", str(tmp_path / "events.jsonl"))
    monkeypatch.setenv("GLIDE_INTEL_LAWS", str(tmp_path / "laws.json"))
    monkeypatch.setenv("Z0INT_STATE_PACKET", str(tmp_path / "memory/STATE-PACKET.md"))
    return module


def put(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value if isinstance(value, str) else json.dumps(value))
    return path


def jsonl(path, rows):
    return put(path, "".join(json.dumps(row) + "\n" for row in rows))


def mock_sources(monkeypatch, intel, values=None):
    calls = []
    values = values or {}

    def read(name, home, config):
        calls.append(name)
        value = values.get(name, {"rows": [], "notes": [name + ": unavailable."], "details": {}})
        if isinstance(value, Exception):
            raise value
        return deepcopy(value)

    monkeypatch.setattr(intel, "_source", read)
    return calls


@pytest.mark.parametrize("tab,index", [("hill", 0), ("skills", 1), ("memory", 2), ("failures", 3), ("trace", 4)])
def test_card_contract_and_no_demo(intel, monkeypatch, tmp_path, tab, index):
    calls = mock_sources(monkeypatch, intel)
    doc = intel.card(tmp_path, tab)
    assert (doc["kind"], doc["app"]) == ("intel-suite", "glide")
    assert "demo" not in doc
    assert doc["data"]["tab"] == index
    assert doc["data"]["at"].endswith("Z")
    assert set(calls) == {"climbs", "routes", "memory", "failures", "trace"}
    for key in calls:
        assert doc["data"][key] == []
        assert any(key in n for n in doc["data"]["notes"])


def test_cache_is_per_source_60_seconds_profile_and_config_and_copy(intel, monkeypatch, tmp_path):
    clock = [10.0]
    monkeypatch.setattr(intel.time, "monotonic", lambda: clock[0])
    calls = mock_sources(monkeypatch, intel)
    doc = intel.card(tmp_path)
    doc["data"]["notes"].clear()
    clock[0] = 69.9
    assert intel.card(tmp_path, "skills")["data"]["notes"]
    assert len(calls) == 5
    clock[0] = 70.1
    intel.card(tmp_path)
    assert len(calls) == 10
    intel.card(tmp_path / "other")
    assert len(calls) == 15
    monkeypatch.setenv("GLIDE_INTEL_CLIMBS", str(tmp_path / "changed"))
    intel.card(tmp_path)
    assert len(calls) == 20


@pytest.mark.parametrize("bad", [None, [], {"rows": "bad"}, {"rows": [7]}, {"rows": [], "notes": [7]}])
def test_malformed_worker_payload_degrades_to_notes(intel, monkeypatch, tmp_path, bad):
    mock_sources(monkeypatch, intel, {"climbs": bad})
    doc = intel.card(tmp_path)
    assert doc["data"]["climbs"] == []
    assert any("climbs" in n and "invalid" in n for n in doc["data"]["notes"])


def test_timeout_does_not_erase_other_source(intel, monkeypatch, tmp_path):
    mock_sources(monkeypatch, intel, {
        "climbs": subprocess.TimeoutExpired("source", 5),
        "routes": {"rows": [{"skill": "synthetic-skill", "hits": 2, "corrected": 0}], "notes": [], "details": {}},
    })
    data = intel.card(tmp_path)["data"]
    assert data["routes"][0]["hits"] == 2
    assert any("climbs" in n and "timeout" in n for n in data["notes"])


def test_worker_is_subprocess_with_hard_timeout(intel, monkeypatch, tmp_path):
    seen = []

    def run(argv, **kwargs):
        seen.append((argv, kwargs))
        raise subprocess.TimeoutExpired(argv, kwargs["timeout"])

    monkeypatch.setattr(intel.subprocess, "run", run)
    with pytest.raises(subprocess.TimeoutExpired):
        intel._source_process("climbs", tmp_path, intel._config())
    argv, kwargs = seen[0]
    assert Path(argv[1]).name == "intel_sources.py"
    assert 0 < kwargs["timeout"] <= 5
    assert kwargs["check"] and kwargs["capture_output"]
    assert not kwargs.get("shell")


def test_subprocess_timeout_actually_terminates_worker(intel, monkeypatch, tmp_path):
    import sys
    import time
    run = subprocess.run
    monkeypatch.setattr(intel, "SOURCE_TIMEOUT", .05)

    def slow_worker(argv, **kwargs):
        return run([sys.executable, "-c", "import time; time.sleep(2)"], **kwargs)

    monkeypatch.setattr(intel.subprocess, "run", slow_worker)
    started = time.monotonic()
    with pytest.raises(subprocess.TimeoutExpired):
        intel._source_process("climbs", tmp_path, intel._config())
    assert time.monotonic() - started < 1


def test_real_worker_missing_sources_is_valid_and_read_only(intel, tmp_path):
    before = set(tmp_path.rglob("*"))
    doc = intel.card(tmp_path)
    assert all(doc["data"][k] == [] for k in ("climbs", "routes", "memory", "failures", "trace"))
    assert len(doc["data"]["notes"]) >= 5
    assert before == set(tmp_path.rglob("*"))


def test_climb_shapes_ignore_call_latency_and_keep_latest_64(intel, tmp_path):
    root = tmp_path / "sample-hillclimb"
    jsonl(root / "calls.jsonl", [{"at": 1, "ok": True, "s": 3.2}])
    jsonl(root / "trials.jsonl", [{"run": "r", "step": i, "train": {"own@3": i, "n": 100}} for i in range(70)])
    put(root / "climb/math.json", {"bench": "math", "log": [{"acc": .2}, {"inc_acc": .4}]})
    put(root / "runs/colony.json", {"curves": {"mushroom": [2, 3, 5], "frequency": [1, 2, 3]}})
    data = intel.card(tmp_path)["data"]
    rows = data["climbs"]
    assert len(rows) == 4
    assert not any("calls" in r["label"] for r in rows)
    trial = next(r for r in rows if r["metric"] == "train own@3 / n")
    assert len(trial["points"]) == 64 and trial["points"][-1] == .69
    assert trial["best"] == .69
    assert all(len(r["id"]) <= 200 and "/" not in r["id"] for r in rows)
    text = intel.detail(tmp_path, "climb", trial["id"])["text"]
    assert "trials.jsonl" in text and "Last 10 points" in text
    assert str(trial["points"][-10:]) in text


def profile(home, now):
    home.mkdir(exist_ok=True)
    db = sqlite3.connect(home / "state.db")
    db.execute("CREATE TABLE messages(id INTEGER PRIMARY KEY, session_id TEXT, role TEXT, content TEXT, tool_call_id TEXT, tool_calls TEXT, tool_name TEXT, timestamp REAL)")
    db.execute("CREATE INDEX session_calls ON messages(session_id, role)")
    call = lambda name, ident: json.dumps([{"id": ident, "type": "function", "function": {"name": "skill_view", "arguments": json.dumps({"name": name})}}])
    rows = [
        ("a", "assistant", None, None, call("synthetic-skill", "c1"), None, now - 60),
        ("a", "tool", '{"success":true}', "c1", None, "skill_view", now - 59),
        ("a", "assistant", None, None, call("synthetic-skill", "c2"), None, now - 30),
        ("a", "tool", '{"success":true}', "c2", None, "skill_view", now - 29),
        ("a", "assistant", None, None, call("old-skill", "c3"), None, now - 8 * 86400),
        ("a", "tool", '{"success":true}', "c3", None, "skill_view", now - 8 * 86400 + 1),
        ("b", "assistant", None, None, None, None, now - 10),
        ("b", "tool", '{"error":"synthetic"}', None, None, "test", now - 9),
        ("c", "assistant", None, None, call("../secret", "c4"), None, now - 5),
        ("c", "tool", '{}', "c4", None, "skill_view", now - 4),
    ]
    db.executemany("INSERT INTO messages(session_id,role,content,tool_call_id,tool_calls,tool_name,timestamp) VALUES(?,?,?,?,?,?,?)", rows)
    db.commit()
    db.close()


def test_profile_routes_join_arguments_details_and_trace(intel, tmp_path):
    import time
    now = time.time()
    profile(tmp_path, now)
    put(tmp_path / "skills/group/synthetic-skill/SKILL.md", "---\nname: synthetic-skill\ndescription: >-\n  A synthetic description\n  on two lines.\n---\n# Body not a description\n")
    before = (tmp_path / "state.db").read_bytes()
    doc = intel.card(tmp_path)
    assert doc["data"]["routes"] == [{"skill": "synthetic-skill", "hits": 2, "corrected": 0}]
    assert any("correction" in n.lower() for n in doc["data"]["notes"])
    assert intel.detail(tmp_path, "skill", "synthetic-skill") == {"text": "synthetic-skill\nA synthetic description on two lines."}
    spans = [s for lane in doc["data"]["trace"] for s in lane["spans"]]
    assert spans and min(s[0] for s in spans) == 0
    assert {s[2] for s in spans} >= {"m", "t", "e"}
    assert all(s[1] >= s[0] >= 0 for s in spans) and len(spans) <= 200
    assert all("session" not in row["lane"] or row["lane"].startswith("session-") for row in doc["data"]["trace"])
    assert (tmp_path / "state.db").read_bytes() == before


def test_skill_lookup_skips_reference_subtrees_and_frontmatter_stops(intel, tmp_path):
    import time
    profile(tmp_path, time.time())
    put(tmp_path / "skills/a-group/synthetic-skill/SKILL.md", "---\nname: synthetic-skill\ndescription: >-\n  Only the description.\nmetadata:\n  unrelated: Not a description.\n---\n# Body\n  Also not a description.\n")
    # A reference-heavy sibling must not consume discovery before loaded skills.
    for i in range(2100):
        put(tmp_path / f"skills/z-group/reference-heavy/references/ref-{i}.md", "synthetic")
    put(tmp_path / "skills/z-group/reference-heavy/SKILL.md", "---\ndescription: A sibling.\n---\n")
    assert intel.detail(tmp_path, "skill", "synthetic-skill")["text"] == "synthetic-skill\nOnly the description."


def test_skill_details_can_show_description_beyond_card_string_limit(intel, tmp_path):
    import time
    profile(tmp_path, time.time())
    description = "Synthetic description. " * 20
    put(tmp_path / "skills/synthetic-skill/SKILL.md", "---\ndescription: " + description + "\n---\n")
    assert intel.detail(tmp_path, "skill", "synthetic-skill")["text"] == "synthetic-skill\n" + description.strip()


def test_memory_sizes_freshness_and_missing_levels(intel, monkeypatch, tmp_path):
    import time
    root = tmp_path / "memory"
    for name in ("capability-index.sqlite3", "FACTS.jsonl", "DOSSIERS.jsonl", "STATE-PACKET.md"):
        put(root / name, "synthetic")
    put(tmp_path / "events.jsonl", "synthetic")
    old = time.time() - 9000
    os.utime(root / "STATE-PACKET.md", (old, old))
    data = intel.card(tmp_path)["data"]
    levels = {r["level"]: r for r in data["memory"]}
    assert set(levels) == {"L0", "L1", "L2", "L4", "L5"}
    assert levels["L5"]["stale"] is True and levels["L0"]["stale"] is False
    assert levels["L5"]["size"] == "9 B"
    assert levels["L5"]["fresh"].endswith("Z")
    assert any("L3" in n for n in data["notes"])


def test_failures_use_observed_replay_not_executed_tapes_and_exact_bend_link(intel, tmp_path):
    root = tmp_path / "ops/token-allocation-20261109"
    put(root / "fix-state.json", {
        "alpha": {"fails": 3, "passes": 1, "ok": False, "cls": "synthetic", "what": "Synthetic A"},
        "canon-15": {"fails": 2, "passes": 3, "ok": True, "cls": "synthetic", "what": "Synthetic B"},
        "beta": {"fails": 1, "passes": 3, "ok": True, "cls": "synthetic", "what": "Synthetic C"},
    })
    put(root / "fix-tapes.json", {"tapes": [{"id": "alpha", "tape": "exit 99"}]})
    jsonl(root / "fix-replay.jsonl", [{"id": "alpha", "ok": i % 2 == 0, "ts": "synthetic"} for i in range(20)])
    put(tmp_path / "laws.json", {"rules": {"15": {"law": "z0 bend/burn_pace at_cap_never_admits", "tape": "exit 99"}}})
    rows = intel.card(tmp_path)["data"]["failures"]
    assert len(rows) == 3 and {r["status"] for r in rows} == {"open", "fixed", "law"}
    row = next(r for r in rows if r["count"] == 3)
    assert row["spark"] == "01010101010101"
    text = intel.detail(tmp_path, "failure", row["sig"])["text"]
    assert "Synthetic A" in text and '"fails": 3' in text
    assert "exit 99" not in text


@pytest.mark.parametrize("action,entity", [("climb", "../../etc/passwd"), ("skill", "../secret"), ("failure", "--help"), ("unknown", "x"), ("skill", "x" * 201)])
def test_details_never_open_request_paths(intel, monkeypatch, tmp_path, action, entity):
    mock_sources(monkeypatch, intel)
    assert "unavailable" in intel.detail(tmp_path, action, entity)["text"].lower()


def test_stock_plugin_command_registration_and_json(intel, monkeypatch, tmp_path):
    from glide_plugin import core
    monkeypatch.setattr(core, "_home", lambda: tmp_path)
    commands = {}
    core.register(SimpleNamespace(register_hook=lambda *a: None, register_command=lambda name, fn, **kw: commands.__setitem__(name, fn)))
    assert "intel" in commands
    mock_sources(monkeypatch, intel)
    assert json.loads(commands["intel"]("--json skills", session_id="synthetic"))["data"]["tab"] == 1
    assert json.loads(commands["intel"]("--json climb unknown"))["text"]
    assert json.loads(commands["intel"]("skill unknown"))["text"]
    assert "/intel" in commands["intel"]("--invalid")
    assert "ephemeral-ui" in commands["intel"]("memory")

"""Live source-worker qualification against an isolated, on-disk fleet profile."""
import json
import sqlite3
import sys
import time

import pytest

from glide_plugin import fleet, gateway


@pytest.fixture
def source_home(tmp_path, monkeypatch):
    # Do not inherit production cluster credentials, fixtures or tool config.
    for key in (*fleet.SOURCE_ENV, *(n for names in fleet.TOOL_ENV.values() for n in names)):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("PATH", str(tmp_path / "no-external-tools"))
    monkeypatch.setenv("GLIDE_TASTE_WORK_CONFIG", str(tmp_path / "work.json"))
    monkeypatch.setenv("GLIDE_FACTORY_OPS", str(tmp_path / "ops"))
    return tmp_path


def _read_card(home, view, **params):
    before = {p.relative_to(home): p.read_bytes() for p in home.rglob("*") if p.is_file()}
    result = gateway.call(home, "fleet", {"view": view, "session_id": "fixture", **params})
    after = {p.relative_to(home): p.read_bytes() for p in home.rglob("*") if p.is_file()}
    assert before == after
    assert result["kind"] == f"fleet-{view}"
    assert all(isinstance(note, str) for note in result["data"]["notes"])
    return result["data"]


def test_hosts_reads_live_gauges_and_read_only_session_db(source_home):
    db = sqlite3.connect(source_home / "state.db")
    try:
        db.execute("CREATE TABLE sessions(id, source, hidden, parent_session_id, model_config, started_at)")
        db.execute("INSERT INTO sessions VALUES (?,?,?,?,?,?)",
                   ("fixture-session", "cli", 0, None, '{"model":"sample"}', time.time()))
        db.commit()
    finally:
        db.close()
    data = _read_card(source_home, "hosts")
    host, = data["hosts"]
    assert host["online"]
    assert isinstance(host["gauges"]["disk"], (float, int))
    if sys.platform == "linux":
        assert all(isinstance(host["gauges"][name], (float, int)) for name in ("cpu", "mem"))
    else:
        assert all(host["gauges"][name] is None for name in ("cpu", "mem"))
    assert [a["id"] for group in host["harnesses"] if group["kind"] == "Hermes"
            for a in group["agents"]] == ["fixture-session"]
    assert any(note.startswith("k3s:") for note in host["notes"])


def test_portfolio_reads_real_work_config_without_external_credentials(source_home):
    (source_home / "work.json").write_text(json.dumps({"products": [
        {"id": "other", "components": []},
        {"id": "sample", "components": [{"id": "core", "name": "Core work", "horizon": "next"}]},
    ]}))
    data = _read_card(source_home, "portfolio", portfolio="sample")
    assert list(data["portfolios"]) == ["sample"]
    component, = data["portfolios"]["sample"]["products"]
    assert component["label"] == "Core work"
    assert component["horizon"] == "next"
    assert component["features"][0]["tasks"] == []


def test_factory_reads_on_disk_queue_brain_and_verification_ledger(source_home):
    ops = source_home / "ops"
    brain = ops / "factory-loop-1102"
    ledger = brain / "hoss12-verify"
    ledger.mkdir(parents=True)
    queue = brain / "queue"
    queue.mkdir()
    (queue / "ready.json").write_text("{}")
    (brain / "brain-state.json").write_text('{"pending_review":[{"tag":"review-item","detail":"Review evidence"}]}')
    (ledger / "salvage-verify.jsonl").write_text('{"verdict":"pass"}\n{"verdict":"fail"}\n')
    data = _read_card(source_home, "factory")
    assert data["stats"]["queue"] == 1
    assert data["stats"]["verifyPass"] == 0.5
    assert [n["label"] for n in data["nodes"]] == ["Factory brain", "review-item"]
    assert len(data["edges"]) == 1

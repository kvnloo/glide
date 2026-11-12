"""Fleet read-only contract checks. All hosts, repositories and sessions are synthetic."""
import json
import sqlite3
import subprocess
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from glide_plugin import fleet, gateway


@pytest.fixture(autouse=True)
def isolated(monkeypatch, tmp_path):
    fleet._CARDS.clear()
    fleet._REPOS.clear()
    monkeypatch.setenv("GLIDE_FACTORY_OPS", str(tmp_path / "ops"))
    monkeypatch.setenv("GLIDE_TASTE_WORK_CONFIG", str(tmp_path / "work.json"))
    monkeypatch.setattr(fleet.socket, "gethostname", lambda: "mbp")
    monkeypatch.setattr(fleet, "_source", lambda *args: (_ for _ in ()).throw(FileNotFoundError()))


def sources(monkeypatch, values):
    calls = []

    def read(name, home, *args):
        calls.append((name, args))
        value = values[name]
        if isinstance(value, Exception):
            raise value
        return value

    monkeypatch.setattr(fleet, "_source", read)
    return calls


def host_sources():
    return {
        "gauges": {"cpu": 40, "mem": 50, "swap": 0, "disk": 60, "gpu": None},
        "tailscale": {"Self": {"HostName": "mbp", "ID": "self", "Online": True},
                      "Peer": {"phone": {"HostName": "s25", "Online": False, "OS": "android"}}},
        "k3s": {"items": [
            {"kind": "Node", "metadata": {"name": "mbp"}, "status": {
                "nodeInfo": {"kubeletVersion": "v1.33"},
                "conditions": [{"type": "Ready", "status": "True"}]}},
            {"kind": "Pod", "metadata": {"namespace": "fleet", "name": "verify"},
             "spec": {"nodeName": "mbp"}, "status": {"phase": "Running", "containerStatuses": [
                 {"restartCount": 2, "state": {"waiting": {"reason": "BackOff"}}}]}},
        ]},
        "processes": [{"kind": "fx", "id": "process:7", "name": "fx", "state": "working",
                       "line": "CPU active", "age": "1m", "model": ""}],
        "sessions": [{"kind": "Hermes", "id": "session-a", "name": "session-a", "state": "idle",
                      "line": "Recent local Hermes session", "age": "2m", "model": "test-model"}],
    }


def test_hosts_full_document_and_pods(monkeypatch, tmp_path):
    sources(monkeypatch, host_sources())
    doc = fleet.card(tmp_path, "hosts")
    assert (doc["kind"], doc["app"]) == ("fleet-hosts", "k3s")
    assert "demo" not in doc
    assert doc["data"]["at"].endswith("Z")
    local, phone = doc["data"]["hosts"]
    assert local["id"] == "mbp" and local["online"] is True
    assert local["gauges"]["cpu"] == 40
    assert local["k3s"] == {"node": "Ready", "version": "v1.33", "pods": [
        ["fleet", "verify", "Running", 2, "BackOff"]]}
    assert local["harnesses"][1]["agents"][0]["id"] == "session-a"
    assert phone["phone"] is True and phone["online"] is False
    assert all(v is None for v in phone["gauges"].values())
    assert phone["notes"]


@pytest.mark.parametrize("view,key", [("hosts", "hosts"), ("portfolio", "portfolios"), ("factory", "nodes")])
def test_missing_sources_remain_valid_visible_documents(tmp_path, view, key):
    doc = fleet.card(tmp_path, view)
    assert key in doc["data"]
    assert doc["data"]["notes"]
    assert all(isinstance(note, str) for note in doc["data"]["notes"])
    if view == "hosts":
        notes = doc["data"]["hosts"][0]["notes"]
        assert notes and all(isinstance(note, str) for note in notes)
    if view == "factory":
        assert 0 <= doc["data"]["stats"]["verifyPass"] <= 1


def test_kit_input_projection_keeps_raw_string_diagnostics_and_other_fields():
    from copy import deepcopy
    from verify_fleet_schema import diagnostic_strings, kit_input, synthetic_documents

    cases = synthetic_documents()
    assert len(cases) == 6
    for case in cases:
        raw = case["doc"]
        original = deepcopy(raw)
        assert isinstance(raw["data"]["notes"], list)
        assert all(isinstance(note, str) for note in raw["data"]["notes"])
        for host in raw["data"].get("hosts", []):
            assert isinstance(host["notes"], list)
            assert all(isinstance(note, str) for note in host["notes"])
        if case["case"].startswith("missing:"):
            assert diagnostic_strings(raw)
        projected = kit_input(raw)
        expected = deepcopy(raw)
        expected["data"].pop("notes")
        for host in expected["data"].get("hosts", []):
            host.pop("notes")
        assert projected == expected
        assert raw == original
        projected["data"]["at"] = "changed"
        assert raw == original

    raw["data"]["unrelated"] = {"notes": ["not a wrapper diagnostic"]}
    assert kit_input(raw)["data"]["unrelated"] == raw["data"]["unrelated"]


@pytest.mark.parametrize("invalid", [None, "not an array", [7]])
@pytest.mark.parametrize("on_host", [False, True])
def test_kit_diagnostics_must_be_string_arrays(invalid, on_host):
    from verify_fleet_schema import diagnostic_strings

    doc = {"data": {"notes": [], "hosts": [{"notes": []}]}}
    target = doc["data"]["hosts"][0] if on_host else doc["data"]
    target["notes"] = invalid
    with pytest.raises(ValueError, match="string array"):
        diagnostic_strings(doc)


@pytest.mark.parametrize("value", [[], "bad", {"items": "bad"}, {"Peer": []}])
def test_malformed_sources_do_not_escape(monkeypatch, tmp_path, value):
    vals = host_sources()
    vals.update(tailscale=value, k3s=value)
    sources(monkeypatch, vals)
    assert fleet.card(tmp_path, "hosts")["data"]["notes"]


def test_timeout_isolated_from_other_sources(monkeypatch, tmp_path):
    vals = host_sources()
    vals["tailscale"] = subprocess.TimeoutExpired("tailscale", 5)
    sources(monkeypatch, vals)
    doc = fleet.card(tmp_path, "hosts")
    assert doc["data"]["hosts"][0]["gauges"]["cpu"] == 40
    assert any("tailscale" in n and "timeout" in n.lower() for n in doc["data"]["notes"])


def test_card_cache_is_30s_keyed_by_home_view_config_and_copied(monkeypatch, tmp_path):
    clock = [100.0]
    monkeypatch.setattr(fleet.time, "monotonic", lambda: clock[0])
    calls = sources(monkeypatch, host_sources())
    doc = fleet.card(tmp_path, "hosts")
    count = len(calls)
    doc["data"]["hosts"].clear()
    clock[0] = 129.9
    assert fleet.card(tmp_path, "hosts")["data"]["hosts"]
    assert len(calls) == count
    clock[0] = 130.1
    fleet.card(tmp_path, "hosts")
    assert len(calls) > count
    count = len(calls)
    fleet.card(tmp_path / "other", "hosts")
    assert len(calls) > count


def work_config():
    return {"repos": {"glide": {"gh": "example/glide"}}, "products": [
        {"id": "glide", "name": "Glide", "components": [
            {"id": "cards", "name": "Cards", "paths": {"glide": ["frontend/**"]},
             "also": ["taste"], "keywords": ["fleet"]}]},
        {"id": "taste", "name": "Taste", "components": []}]}


def test_portfolio_components_links_and_open_repo_tasks(monkeypatch, tmp_path):
    calls = sources(monkeypatch, {"config": work_config(), "github": [
        {"number": 1, "title": "fleet bug", "url": "https://github.com/example/glide/issues/1",
         "state": "OPEN", "labels": [{"name": "bug"}]},
        {"number": 2, "title": "fleet PR", "url": "https://github.com/example/glide/pull/2",
         "state": "OPEN", "isDraft": False},
    ]})
    data = fleet.card(tmp_path, "portfolio", "glide")["data"]
    assert list(data["portfolios"]) == ["glide"]
    board = data["portfolios"]["glide"]
    product = board["products"][0]
    assert product["id"] == "glide:cards" and product["label"] == "Cards"
    feature = product["features"][0]
    assert feature["tasks"][0]["url"].startswith("https://github.com/")
    assert feature["tasks"][0]["defect"] is True
    assert {t["status"] for t in feature["tasks"]} == {"next", "active"}
    assert any(f.get("uses") or f.get("owns") for f in product["features"])
    assert board["shared"]
    assert sum(name == "github" for name, _ in calls) == 1


def test_product_action_identity_and_shared_owners_are_global(monkeypatch, tmp_path):
    config = work_config()
    for board in config["products"]:
        board["components"] = [
            {"id": cid, "name": cid, "paths": {"glide": ["**"]}, "also": ["shared"]}
            for cid in ("tests", "docs", "voice")
        ]
    sources(monkeypatch, {"config": config, "github": [
        {"number": 1, "title": "shared task", "url": "https://github.com/example/glide/issues/1"},
    ]})
    boards = fleet.card(tmp_path, "portfolio")["data"]["portfolios"]
    products = [p for board in boards.values() for p in board["products"]]
    assert {p["id"] for p in products} == {
        f"{key}:{cid}" for key in ("glide", "taste") for cid in ("tests", "docs", "voice")
    }
    actions = [(p["id"], f["id"], t["id"])
               for p in products for f in p["features"] for t in f["tasks"]]
    assert len(actions) == len(set(actions)) == 6
    for key, board in boards.items():
        ids = {p["id"] for p in board["products"]}
        assert {s["owner"] for s in board["shared"]} == ids
        selected = fleet.card(tmp_path, "portfolio", key)["data"]["portfolios"][key]
        assert selected["products"] == board["products"]


def test_repo_cache_is_60_seconds(monkeypatch, tmp_path):
    clock = [10.0]
    monkeypatch.setattr(fleet.time, "monotonic", lambda: clock[0])
    calls = sources(monkeypatch, {"config": work_config(), "github": []})
    fleet.card(tmp_path, "portfolio")
    clock[0] = 41
    fleet.card(tmp_path, "portfolio")
    assert sum(n == "github" for n, _ in calls) == 1
    clock[0] = 72
    fleet.card(tmp_path, "portfolio")
    assert sum(n == "github" for n, _ in calls) == 2


def test_unknown_portfolio_and_bad_config_are_notes(monkeypatch, tmp_path):
    sources(monkeypatch, {"config": work_config()})
    data = fleet.card(tmp_path, "portfolio", "unknown")["data"]
    assert data["portfolios"] == {} and data["notes"]
    fleet._CARDS.clear()
    sources(monkeypatch, {"config": {"products": "bad"}})
    assert fleet.card(tmp_path, "portfolio")["data"]["notes"]


def test_factory_observed_shapes_and_node_cap(monkeypatch, tmp_path):
    sources(monkeypatch, {
        "ops": {"queue": 2, "depth": 2, "sendsHour": 3, "posted": 1, "notes": []},
        "verify": [{"verdict": "pass"}, {"verdict": "fail-green-fails"},
                   {"verdict": "skip-no-py-test"}],
        "brain": {"last_run": "2026-11-11T10:00:00Z", "verifier_lanes": {"lane": "DOWN"},
                  "pending_review": ["example/glide#1"],
                  "hoss_queued": [f"card-{i}" for i in range(80)]},
    })
    data = fleet.card(tmp_path, "factory")["data"]
    assert data["stats"] == {"queue": 2, "depth": 2, "sendsHour": 3, "capHour": 30,
                             "posted": 1, "verifyPass": .5}
    assert 1 < len(data["nodes"]) <= 60
    assert any(n["state"] == "failing" for n in data["nodes"])
    ids = {n["id"] for n in data["nodes"]}
    assert len(ids) == len(data["nodes"])
    assert all(e[0] in ids and e[1] in ids and isinstance(e[3], bool) for e in data["edges"])


def test_pod_known_node_target_and_read_only_command(monkeypatch, tmp_path):
    sources(monkeypatch, host_sources())
    calls = []
    monkeypatch.setattr(fleet, "_command", lambda argv: calls.append(argv) or "pod details")
    assert fleet.pod(tmp_path, "mbp", "fleet", "verify") == {"text": "pod details"}
    assert calls == [["kubectl", "--request-timeout=4s", "describe", "pod", "verify", "--namespace", "fleet"]]


@pytest.mark.parametrize("host,ns,name", [
    ("unknown", "fleet", "verify"), ("s25", "fleet", "verify"),
    ("mbp", "--context=evil", "verify"), ("mbp", "fleet", "--help"),
    ("mbp", "fleet;whoami", "verify"), ("mbp", "fleet", "other"),
])
def test_pod_rejects_unknown_host_wrong_node_and_flag_injection(monkeypatch, tmp_path, host, ns, name):
    sources(monkeypatch, host_sources())
    monkeypatch.setattr(fleet, "_command", lambda argv: pytest.fail("unsafe describe"))
    with pytest.raises(ValueError):
        fleet.pod(tmp_path, host, ns, name)


def test_pod_timeout_returns_visible_text(monkeypatch, tmp_path):
    sources(monkeypatch, host_sources())
    monkeypatch.setattr(fleet, "_command", lambda argv: (_ for _ in ()).throw(subprocess.TimeoutExpired(argv, 4)))
    assert "timeout" in fleet.pod(tmp_path, "mbp", "fleet", "verify")["text"].lower()


def test_gateway_schema_full_document_and_pod(monkeypatch, tmp_path):
    sentinel = {"kind": "fleet-hosts", "app": "k3s", "data": {"hosts": []}}
    monkeypatch.setattr(fleet, "card", lambda home, view, portfolio=None: sentinel)
    monkeypatch.setattr(fleet, "pod", lambda *args: {"text": "details"})
    assert gateway.call(tmp_path, "fleet", {"session_id": "session-a", "view": "hosts"}) is sentinel
    assert gateway.call(tmp_path, "fleet_pod", {"session_id": "session-a", "host": "mbp", "ns": "fleet", "name": "verify"}) == {"text": "details"}
    for extra in ({"view": "unknown"}, {"view": "hosts", "extra": True}, {"view": "hosts", "portfolio": 1}):
        with pytest.raises(ValidationError):
            gateway.call(tmp_path, "fleet", {"session_id": "session-a", **extra})


@pytest.mark.parametrize("view,key", [("hosts", "hosts"), ("portfolio", "portfolios"), ("factory", "nodes")])
def test_stock_command_registered_without_gateway_methods(monkeypatch, tmp_path, view, key):
    from glide_plugin import core

    commands = {}
    core.register(SimpleNamespace(register_hook=lambda *a: None,
        register_command=lambda name, fn, **kw: commands.setdefault(name, fn)))
    monkeypatch.setattr(core, "_home", lambda: tmp_path)
    doc = json.loads(commands["fleet"](view, session_id="session-a"))
    assert doc == gateway.call(tmp_path, "fleet", {"session_id": "session-a", "view": view})
    assert doc["kind"] == f"fleet-{view}" and key in doc["data"]
    assert doc["data"]["at"].endswith("Z") and doc["data"]["notes"]
    assert "demo" not in doc


def test_stock_command_validates_pods_and_does_not_accept_session_override(monkeypatch, tmp_path):
    from glide_plugin import core

    monkeypatch.setattr(core, "_home", lambda: tmp_path)
    sources(monkeypatch, host_sources())
    monkeypatch.setattr(fleet, "_command", lambda argv: "Synthetic pod details")
    args = json.dumps({"host": "mbp", "ns": "fleet", "name": "verify"})
    assert json.loads(gateway.command(f"pod {args}", "session-a")) == {"text": "Synthetic pod details"}
    assert "error" in json.loads(gateway.command('pod {"host":"mbp","ns":"--help","name":"verify"}', "session-a"))
    assert "error" in json.loads(gateway.command("hosts", None))
    assert "error" in json.loads(gateway.command("unknown", "session-a"))
    for raw in ('not-json', '[]', '{"extra":true}', '{"view":"factory"}'):
        assert "error" in json.loads(gateway.command(f"hosts {raw}", "session-a"))
    assert "hosts" in json.loads(gateway.command('hosts {"session_id":"foreign"}', "session-a"))["data"]


def test_gateway_registration_preserves_attached_session(monkeypatch, tmp_path):
    registered = {}
    gateway.register(SimpleNamespace(register_gateway_method=lambda name, fn, **kw: registered.setdefault(name, fn)))
    request = SimpleNamespace(session_id="session-a", assert_attached=lambda: None)
    with pytest.raises(PermissionError):
        registered["glide.fleet"](request, {"session_id": "session-b", "view": "hosts"})
    assert "glide.fleet_pod" in registered


def test_source_file_worker_and_commands_are_timeboxed(monkeypatch, tmp_path):
    calls = []

    def run(argv, **kwargs):
        calls.append((argv, kwargs))
        return SimpleNamespace(stdout='{"products": []}', returncode=0)

    monkeypatch.setattr(fleet.subprocess, "run", run)
    assert fleet._source_process("config", tmp_path, "work.json") == {"products": []}
    fleet._command(["ps", "-eo", "pid,comm"])
    assert all(0 < kw["timeout"] <= 5 and not kw.get("shell") for _, kw in calls)
    assert any(str(fleet.__file__) in argv for argv, _ in calls)


def test_worker_timeout_not_swallowed(monkeypatch, tmp_path):
    def run(*args, **kwargs):
        raise subprocess.TimeoutExpired(args[0], kwargs["timeout"])
    monkeypatch.setattr(fleet.subprocess, "run", run)
    with pytest.raises(subprocess.TimeoutExpired):
        fleet._source_process("config", tmp_path, "work.json")


def test_github_read_only_limits_and_repo_validation(monkeypatch):
    calls = []
    monkeypatch.setattr(fleet, "_command", lambda argv: calls.append(argv) or "[]")
    assert fleet._github("example/glide") == []
    assert len(calls) == 2
    assert all(c[:3] in (["gh", "issue", "list"], ["gh", "pr", "list"]) for c in calls)
    assert all(c[c.index("--limit") + 1] == "20" and c[c.index("--state") + 1] == "open" for c in calls)
    with pytest.raises(ValueError):
        fleet._github("--repo=evil")


def test_bounded_file_reads_reject_symlinks_fifos_and_oversize(tmp_path):
    p = tmp_path / "data.json"
    p.write_text('{"ok": true}')
    assert json.loads(fleet._read(p)) == {"ok": True}
    link = tmp_path / "link.json"
    link.symlink_to(p)
    with pytest.raises((OSError, ValueError)):
        fleet._read(link)
    p.write_bytes(b"x" * (fleet.MAX_BYTES + 1))
    with pytest.raises(ValueError):
        fleet._read(p)
    import os
    fifo = tmp_path / "fifo"
    os.mkfifo(fifo)
    with pytest.raises(ValueError):
        fleet._read(fifo)


def test_hermes_recent_sessions_are_read_only_and_not_process_ids(tmp_path):
    db = sqlite3.connect(tmp_path / "state.db")
    db.execute("CREATE TABLE sessions (id TEXT, title TEXT, source TEXT, hidden INT, parent_session_id TEXT, model_config TEXT, started_at REAL, ended_at REAL, last_activity_at REAL)")
    import time
    now = time.time()
    for sid, source, hidden, parent, age in [("session-a", "cli", 0, None, 60),
            ("old", "cli", 0, None, 1000), ("hidden", "cli", 1, None, 1),
            ("child", "cli", 0, "session-a", 1), ("remote", "telegram", 0, None, 1)]:
        db.execute("INSERT INTO sessions VALUES (?,?,?,?,?,?,?,?,?)", (sid, sid, source, hidden, parent, '{"model":"test"}', now-age, None, now-age))
    db.commit()
    db.close()
    agents = fleet._sessions(tmp_path)
    assert [a["id"] for a in agents] == ["session-a"]
    assert agents[0]["kind"] == "Hermes" and agents[0]["model"] == "test"


def test_process_detection_avoids_argument_matches(monkeypatch):
    monkeypatch.setattr(fleet, "_command", lambda argv: "7 25.0 R 60 fx\n8 0.0 S 120 claude\n9 0.0 D 10 codex\n10 99.0 R 60 python\n11 0.0 Z 20 pi\n")
    samples = {}
    def counters(pid):
        samples[pid] = samples.get(pid, 0) + 1
        return (samples[pid] if pid == "7" else 0, 0)
    monkeypatch.setattr(fleet, "_counters", counters)
    monkeypatch.setattr(fleet.time, "sleep", lambda seconds: None)
    states = {p["name"]: p["state"] for p in fleet._processes()}
    assert states == {"fx": "working", "claude": "idle", "codex": "blocked", "pi": "offline"}


@pytest.mark.parametrize("comm,args,expected", [
    ("node", "/usr/bin/node /synthetic/bin/fx.js ask", "fx"),
    ("node", "/usr/bin/node /synthetic/bin/fx.js ask 'unfinished prompt", "fx"),
    ("node-MainThread", "/usr/bin/node --expose-gc /synthetic/bin/claude.mjs", "claude"),
    ("node", "/usr/bin/node '/synthetic/space dir/codex.js'", "codex"),
    ("python3", "/usr/bin/python3 /synthetic/bin/hermes", "hermes"),
    ("python3", "/usr/bin/python3 -u /synthetic/bin/fx-canon ask", "fx"),
    ("python3", "/usr/bin/python3 -m hermes_cli", "hermes"),
    ("fx-canon", "/synthetic/bin/fx-canon ask", "fx"),
    ("python3", "/usr/bin/python3 /synthetic/worker.py --prompt fx", None),
    ("node", "/usr/bin/node /synthetic/not-codex.js", None),
    ("python3", "/usr/bin/python3 -c 'import hermes'", None),
    ("node", "/usr/bin/node -e 'console.log(1)' /synthetic/fx.js", None),
    ("node", "/usr/bin/node --require /synthetic/fx.js /synthetic/worker.js", None),
    ("bash", "/usr/bin/bash /synthetic/fx.js", None),
    ("node", "/usr/bin/node /synthetic/fx/worker.js --label codex", None),
    ("python3", "/usr/bin/python3 '/synthetic/hermes", None),
])
def test_process_wrapper_entrypoints_not_arbitrary_arguments(monkeypatch, comm, args, expected):
    def command(argv):
        assert "args=" in argv[-1]
        return f"7 0.0 S 60 {comm} {args}\n"
    monkeypatch.setattr(fleet, "_command", command)
    monkeypatch.setattr(fleet, "_counters", lambda pid: (0, 0))
    monkeypatch.setattr(fleet.time, "sleep", lambda seconds: None)
    agents = fleet._processes()
    assert [a["name"] for a in agents] == ([expected] if expected else [])
    assert all(a["id"] == "process:7" for a in agents)
    if expected == "hermes":
        assert agents[0]["kind"] == "Hermes process"


def test_ops_bounded_scan_counts_only_unclaimed_queue_and_success(monkeypatch, tmp_path):
    run = tmp_path / "run"
    queue = run / "queue"
    queue.mkdir(parents=True)
    for name in ("one.json", "two.json", "skip.json.claimed-mbp", ".claimed-no.json", "skip.txt"):
        (queue / name).write_text("{}")
    import time
    now = time.time()
    (run / "dispatches.jsonl").write_text("\n".join(json.dumps(x) for x in [
        {"dispatch_t0": now - 2, "send_attempted": True, "send_status": "sent"},
        {"dispatch_t0": now - 2, "send_attempted": False, "send_status": "previous_attempt"},
        {"dispatch_t0": now - 4000, "send_attempted": True, "send_status": "sent"}]))
    (run / "posted.jsonl").write_text('{"rc":0}\n{"rc":1}\nbad json\n')
    data = fleet._ops(tmp_path)
    assert (data["queue"], data["depth"], data["sendsHour"], data["posted"]) == (2, 2, 1, 1)
    assert data["notes"]


@pytest.mark.parametrize("name", ["gauges", "tailscale", "k3s", "processes", "sessions", "config", "github", "ops", "brain", "verify"])
def test_every_source_including_files_has_worker_deadline(monkeypatch, tmp_path, name):
    def run(argv, **kwargs):
        assert kwargs["timeout"] == 5
        assert argv[2] == name
        return SimpleNamespace(stdout="null")
    monkeypatch.setattr(fleet.subprocess, "run", run)
    assert fleet._source_process(name, tmp_path, "synthetic") is None


def test_gauges_proc_mem_swap_disk_gpu(monkeypatch):
    monkeypatch.setattr(fleet, "_read", lambda path: "2.0 1 1" if path.name == "loadavg" else
                        "MemTotal: 100 kB\nMemAvailable: 25 kB\nSwapTotal: 100 kB\nSwapFree: 50 kB\n")
    monkeypatch.setattr(fleet.os, "cpu_count", lambda: 8)
    monkeypatch.setattr(fleet.shutil, "disk_usage", lambda path: SimpleNamespace(used=60, total=100))
    monkeypatch.setattr(fleet, "_command", lambda argv: "20\n40\n")
    assert fleet._gauges() == {"cpu": 25, "mem": 75, "swap": 50, "disk": 60, "gpu": 30, "notes": []}


def test_gauges_missing_sources_have_notes(monkeypatch):
    def absent(*args):
        raise FileNotFoundError()
    monkeypatch.setattr(fleet, "_read", absent)
    monkeypatch.setattr(fleet, "_command", absent)
    monkeypatch.setattr(fleet.shutil, "disk_usage", absent)
    data = fleet._gauges()
    assert all(data[k] is None for k in ("cpu", "mem", "swap", "disk", "gpu"))
    assert len(data["notes"]) == 4


def test_other_known_cluster_node_never_becomes_remote_command(monkeypatch, tmp_path):
    vals = host_sources()
    vals["k3s"]["items"][0]["metadata"]["name"] = "s25"
    vals["k3s"]["items"][1]["spec"]["nodeName"] = "s25"
    sources(monkeypatch, vals)
    calls = []
    monkeypatch.setattr(fleet, "_command", lambda argv: calls.append(argv) or "details")
    assert fleet.pod(tmp_path, "s25", "fleet", "verify") == {"text": "details"}
    assert "s25" not in calls[0] and calls[0][0] == "kubectl"
    with pytest.raises(ValueError):
        fleet.pod(tmp_path, "mbp", "fleet", "verify")


def test_local_tailnet_alias_does_not_duplicate_host(monkeypatch, tmp_path):
    vals = host_sources()
    vals["tailscale"]["Self"]["HostName"] = "groot"
    vals["k3s"]["items"][0]["metadata"]["name"] = "groot"
    vals["k3s"]["items"][1]["spec"]["nodeName"] = "groot"
    sources(monkeypatch, vals)
    hosts = fleet.card(tmp_path, "hosts")["data"]["hosts"]
    assert len(hosts) == 2 and hosts[0]["k3s"]["pods"]


def test_scan_cap_is_explicit_and_does_not_recurse(tmp_path, monkeypatch):
    monkeypatch.setattr(fleet, "MAX_ENTRIES", 2)
    for i in range(4):
        (tmp_path / str(i)).write_text("{}")
    notes = []
    assert len(fleet._entries(tmp_path, notes)) == 2
    assert notes and "partial" in notes[0]


def test_ops_does_not_follow_symlink_queue(tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "one.json").write_text("{}")
    run = tmp_path / "run"
    run.mkdir()
    (run / "queue").symlink_to(outside, target_is_directory=True)
    assert fleet._ops(tmp_path)["queue"] == 0


def test_stopped_run_queue_is_not_active(tmp_path):
    queue = tmp_path / "run" / "queue"
    queue.mkdir(parents=True)
    (queue / "one.json").write_text("{}")
    (queue.parent / "STOP").write_text("stopped")
    assert fleet._ops(tmp_path)["queue"] == 0


def test_source_worker_error_keeps_safe_timeout_note(monkeypatch, tmp_path):
    monkeypatch.setattr(fleet.subprocess, "run", lambda *args, **kwargs:
                        SimpleNamespace(stdout='{"_unavailable":"config: timeout, source unavailable."}'))
    monkeypatch.setattr(fleet, "_source", fleet._source_process)
    notes = []
    assert fleet._get("config", tmp_path, notes, {}, "synthetic") == {}
    assert "timeout" in notes[0]


def test_pod_gateway_forbids_context_and_extra_fields(tmp_path):
    for extra in ({"context": "evil"}, {"host": "--server=evil", "ns": "--help"}):
        with pytest.raises(ValidationError):
            gateway.call(tmp_path, "fleet_pod", {"session_id": "session-a", "host": "mbp", "ns": "fleet", "name": "verify", **extra})


def test_github_interleaves_and_caps_total(monkeypatch):
    def command(argv):
        return json.dumps([{"number": i, "url": f"https://github.com/example/glide/{argv[1]}/{i}"} for i in range(20)])
    monkeypatch.setattr(fleet, "_command", command)
    rows = fleet._github("example/glide")
    assert len(rows) == 20
    assert any("/issue/" in r["url"] for r in rows) and any("/pr/" in r["url"] for r in rows)


def test_worker_dispatch_uses_only_named_file_sources(monkeypatch, tmp_path):
    seen = []
    monkeypatch.setattr(fleet, "_read", lambda path: seen.append(path) or "{}")
    assert fleet._collect("config", tmp_path, [str(tmp_path / "work.json")]) == {}
    assert fleet._collect("brain", tmp_path, [str(tmp_path)]) == {}
    assert seen == [tmp_path / "work.json", tmp_path / "factory-loop-1102/brain-state.json"]
    with pytest.raises(ValueError):
        fleet._collect("arbitrary-command", tmp_path, [])

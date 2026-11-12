"""Read-only fleet.v0 documents. Each source, including files, runs in a 5s worker.

Public API: card(home, view, portfolio=None), pod(home, host, ns, name).
Missing sources live in data.notes and host.notes, never synthetic demo rows.
"""
from __future__ import annotations

from collections import OrderedDict
from copy import deepcopy
from datetime import datetime, timezone
from itertools import islice
import json
import math
import os
from pathlib import Path
import re
import shlex
import shutil
import socket
import sqlite3
import stat
import subprocess
import sys
import time

try:
    from .child_env import child_env
except ImportError:  # run as a script (_source_process)
    from child_env import child_env

SOURCE_TIMEOUT = 5
MAX_BYTES = 2 * 1024 * 1024
MAX_ENTRIES = 2048
MAX_HOSTS = 128
MAX_ROWS = 256
MAX_NODES = 60
_DEFAULT_ROOT = Path("/mnt/zer0models/workspace/zer0")  # privacy: ok
_CARDS: OrderedDict = OrderedDict()
_REPOS: OrderedDict = OrderedDict()
_DEADLINE: float | None = None


class SourceUnavailable(ValueError):
    """A safe diagnostic returned by our worker, without command stderr or file contents."""


_DNS = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\Z")
_POD = re.compile(r"[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\Z")
_REPO = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,99}/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\Z")


# Each fleet tool's own credentials and config; everything else stays in this process.
TOOL_ENV = {
    "gh": ("GH_TOKEN", "GITHUB_TOKEN", "GH_HOST", "GH_CONFIG_DIR", "GH_ENTERPRISE_TOKEN"),
    "kubectl": ("KUBECONFIG",),
}
SOURCE_ENV = ("GLIDE_FLEET_FIXTURE", "GLIDE_TASTE_WORK_CONFIG", "GLIDE_FACTORY_OPS")


def _command(argv: list[str]) -> str:
    timeout = min(4, _DEADLINE - time.monotonic()) if _DEADLINE is not None else 4
    if timeout <= 0:
        raise subprocess.TimeoutExpired(argv, SOURCE_TIMEOUT)
    result = subprocess.run(argv, capture_output=True, text=True, timeout=timeout, check=True, env=_tool_env(argv))
    if len(result.stdout) > MAX_BYTES:
        raise ValueError("command output exceeds size limit")
    return result.stdout


def _tool_env(argv: list[str]) -> dict[str, str]:
    """A minimal child env plus the credentials of that one tool (gh, kubectl), never provider keys."""
    return child_env(TOOL_ENV.get(Path(argv[0]).name, ()), {"GH_PROMPT_DISABLED": "1", "GIT_TERMINAL_PROMPT": "0"})


def _source_process(name: str, home: Path, *args):
    # The source child runs _command itself, so it gets the union of the tools' names.
    names = {n for group in TOOL_ENV.values() for n in group} | set(SOURCE_ENV)
    result = subprocess.run([sys.executable, str(Path(__file__).absolute()), name, str(home),
                             *map(str, args)], capture_output=True, text=True,
                            timeout=SOURCE_TIMEOUT, check=True, env=child_env(sorted(names)))
    if len(result.stdout) > MAX_BYTES:
        raise ValueError("source output exceeds size limit")
    value = json.loads(result.stdout)
    if isinstance(value, dict) and "_unavailable" in value:
        raise SourceUnavailable(str(value["_unavailable"])[:300])
    return value


_source = _source_process


def _read(path: Path, *, tail=False) -> str:
    fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK | getattr(os, "O_NOFOLLOW", 0))
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode):
            raise ValueError("not a regular file")
        if info.st_size > MAX_BYTES and not tail:
            raise ValueError("file exceeds size limit")
        if tail and info.st_size > MAX_BYTES:
            stream.seek(-MAX_BYTES, os.SEEK_END)
            raw = stream.read(MAX_BYTES).split(b"\n", 1)[-1]
        else:
            raw = stream.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("file exceeds size limit")
        return raw.decode("utf-8")


def _entries(path: Path, notes: list[str]):
    with os.scandir(path) as stream:
        entries = list(islice(stream, MAX_ENTRIES + 1))
    if len(entries) > MAX_ENTRIES:
        notes.append("Directory scan capped at 2048 entries; counts are partial.")
    return entries[:MAX_ENTRIES]


def _jsonl(path: Path, notes: list[str]) -> list[dict]:
    text = _read(path, tail=True)
    if path.stat().st_size > MAX_BYTES:
        notes.append(f"{path.name}: latest 2 MiB only; counts are partial.")
    lines = text.splitlines()
    if len(lines) > 10000:
        notes.append(f"{path.name}: latest 10000 rows only; counts are partial.")
    rows = []
    for line in lines[-10000:]:
        try:
            row = json.loads(line)
            if not isinstance(row, dict):
                raise ValueError("not an object")
            rows.append(row)
        except (ValueError, RecursionError):
            if f"{path.name}: invalid rows ignored." not in notes:
                notes.append(f"{path.name}: invalid rows ignored.")
    return rows


def _reason(name: str, error: Exception) -> str:
    if isinstance(error, SourceUnavailable):
        return str(error)
    if isinstance(error, subprocess.TimeoutExpired):
        return f"{name}: timeout, source unavailable."
    if isinstance(error, FileNotFoundError):
        return f"{name}: source not installed or missing."
    return f"{name}: source unavailable or invalid ({type(error).__name__})."


def _fixture(root: str, name: str, *args):
    """GLIDE_FLEET_FIXTURE=<dir>: synthetic sources for demos and films. Reads <name>.json, or
    github/<owner>__<repo>.json for a repository's tasks; nothing is run or contacted."""
    leaf = f"github/{args[0].replace('/', '__')}.json" if name == "github" else f"{name}.json"
    return json.loads(_read(Path(root) / leaf))


def _get(name, home, notes, fallback, *args):
    try:
        fixture = os.environ.get("GLIDE_FLEET_FIXTURE")
        return _fixture(fixture, name, *args) if fixture else _source(name, home, *args)
    except (OSError, ValueError, subprocess.SubprocessError, RecursionError) as error:
        notes.append(_reason(name, error))
        return deepcopy(fallback)


def _store(cache, key, value, capacity):
    cache[key] = (time.monotonic(), deepcopy(value))
    cache.move_to_end(key)
    while len(cache) > capacity:
        cache.popitem(last=False)


def card(home: Path, view: str, portfolio: str | None = None) -> dict:
    """A complete card document, cached for 30 seconds and isolated from caller mutation."""
    if view not in ("hosts", "portfolio", "factory"):
        raise ValueError("unknown fleet view")
    config = os.environ.get("GLIDE_TASTE_WORK_CONFIG", str(_DEFAULT_ROOT / "oss/taste-skill/examples/taste-atlas/scripts/work.config.json"))
    ops = os.environ.get("GLIDE_FACTORY_OPS", str(_DEFAULT_ROOT / "data/operations"))
    key = (str(home), view, portfolio, config, ops, os.environ.get("GLIDE_FLEET_FIXTURE"))
    cached = _CARDS.get(key)
    if cached and time.monotonic() - cached[0] < 30:
        return deepcopy(cached[1])
    notes: list[str] = []
    if view == "hosts":
        data, app = _hosts(home, notes), "k3s"
    elif view == "portfolio":
        data, app = _portfolio(home, config, portfolio, notes), "dash"
    else:
        data, app = _factory(home, ops, notes), "aodl"
    data.update(at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), notes=notes)
    result = {"kind": f"fleet-{view}", "app": app, "data": data}
    _store(_CARDS, key, result, 32)
    return result


def _empty_host(name, online=False):
    return {"id": name, "label": name, "role": "Tailnet peer", "online": online,
            "gauges": dict.fromkeys(("cpu", "mem", "swap", "disk", "gpu")),
            "k3s": None, "harnesses": [], "notes": []}


def _hosts(home, notes):
    local_name = socket.gethostname()
    local = _empty_host(local_name, True)
    local["role"] = "Local host"
    hosts = {local_name: local}
    gauges = _get("gauges", home, notes, {})
    if not isinstance(gauges, dict):
        notes.append("gauges: invalid source data.")
    else:
        for key in local["gauges"]:
            value = gauges.get(key)
            if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value):
                local["gauges"][key] = max(0, min(100, value))
        notes.extend(gauges.get("notes", []))
    tailnet = _get("tailscale", home, notes, {})
    try:
        if not isinstance(tailnet, dict) or not isinstance(tailnet.get("Peer", {}), dict):
            raise ValueError("invalid tailnet")
        own = tailnet.get("Self", {})
        if own.get("HostName"):
            # Use the local hostname as the stable card id, remembering the tailnet alias for nodes.
            local["label"] = own["HostName"]
        for peer in list(tailnet.get("Peer", {}).values())[:MAX_HOSTS - 1]:
            name = peer["HostName"]
            if not isinstance(name, str) or not name:
                raise ValueError("invalid peer")
            if name in (local_name, local["label"]):
                continue
            host = _empty_host(name, peer.get("Online") is True)
            host["phone"] = str(peer.get("OS", "")).lower() in ("android", "ios", "ipados")
            host["notes"] = ["Remote gauges and harnesses unavailable; no remote commands are run."]
            hosts[name] = host
    except (KeyError, TypeError, AttributeError, ValueError):
        notes.append("tailscale: invalid source data.")
    cluster = _get("k3s", home, notes, {"items": []})
    try:
        rows = cluster["items"]
        if not isinstance(rows, list):
            raise ValueError("invalid cluster list")
        node_hosts = {}
        for node in rows[:MAX_ENTRIES]:
            if node.get("kind") != "Node":
                continue
            name = node["metadata"]["name"]
            status = node.get("status", {})
            ready = any(c.get("type") == "Ready" and c.get("status") == "True" for c in status.get("conditions", []))
            if name in (local_name, local["label"]):
                host = local
            else:
                host = hosts.setdefault(name, _empty_host(name, ready)) if len(hosts) < MAX_HOSTS else hosts.get(name)
            if host is None:
                continue
            host["k3s"] = {"node": "Ready" if ready else "NotReady", "version": status.get("nodeInfo", {}).get("kubeletVersion", ""), "pods": []}
            host["role"] += " · k3s node"
            node_hosts[name] = host
        for pod_row in rows[:MAX_ENTRIES]:
            if pod_row.get("kind") != "Pod":
                continue
            host = node_hosts.get(pod_row.get("spec", {}).get("nodeName"))
            if host is None or len(host["k3s"]["pods"]) >= MAX_ROWS:
                continue
            metadata, status = pod_row["metadata"], pod_row.get("status", {})
            containers = status.get("containerStatuses", []) + status.get("initContainerStatuses", [])
            reasons = [v.get("reason", "") for c in containers for v in c.get("state", {}).values()]
            host["k3s"]["pods"].append([metadata["namespace"], metadata["name"], status.get("phase", "Unknown"),
                                         sum(int(c.get("restartCount", 0)) for c in containers),
                                         "; ".join(filter(None, reasons)) or status.get("reason", "")])
        if len(rows) > MAX_ENTRIES:
            notes.append("k3s: row limit reached; cluster data is partial.")
    except (KeyError, TypeError, AttributeError, ValueError):
        notes.append("k3s: invalid source data.")
    groups = {}
    for source in ("processes", "sessions"):
        agents = _get(source, home, notes, [])
        if not isinstance(agents, list):
            notes.append(f"{source}: invalid source data.")
            continue
        for agent in agents[:MAX_ROWS]:
            try:
                kind = agent["kind"]
                row = {k: agent[k] for k in ("id", "name", "state", "line", "age", "model")}
                if row["state"] not in ("working", "blocked", "idle", "offline"):
                    raise ValueError("invalid state")
                groups.setdefault(kind, []).append(row)
            except (KeyError, TypeError, ValueError):
                notes.append(f"{source}: invalid agent omitted.")
    local["harnesses"] = [{"kind": k, "agents": v} for k, v in groups.items()]
    local["notes"] = list(notes)
    return {"hosts": list(hosts.values())}


def pod(home: Path, host: str, ns: str, name: str) -> dict:
    """Describe only a pod present on the requested known node in our local cluster snapshot.

    Host is a membership check, never an SSH target, kube context or command argument.
    """
    if not isinstance(ns, str) or not _DNS.fullmatch(ns) or not isinstance(name, str) or not _POD.fullmatch(name):
        raise ValueError("invalid pod namespace or name")
    known = next((h for h in card(home, "hosts")["data"]["hosts"] if h["id"] == host), None)
    if known is None or not known["k3s"] or not any(p[:2] == [ns, name] for p in known["k3s"]["pods"]):
        raise ValueError("pod is not on the requested known cluster node")
    try:
        text = _command(["kubectl", "--request-timeout=4s", "describe", "pod", name, "--namespace", ns])
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        text = _reason("kubectl describe pod", error)
    return {"text": text}


def _horizon(value):
    return value if value in ("now", "next", "later") else "now"


def _tasks(home, repo, notes):
    key = (str(home), repo)
    cached = _REPOS.get(key)
    if cached and time.monotonic() - cached[0] < 60:
        rows, errors = deepcopy(cached[1])
    else:
        errors = []
        rows = _get("github", home, errors, [], repo)
        _store(_REPOS, key, (rows, errors), 64)
    notes.extend(errors)
    if not isinstance(rows, list):
        notes.append("github: invalid task list.")
        return []
    tasks = []
    for row in rows[:20]:
        try:
            url = row["url"]
            if not isinstance(url, str) or not url.startswith("https://github.com/"):
                raise ValueError("invalid task url")
            labels = [l["name"] if isinstance(l, dict) else l for l in row.get("labels", [])]
            status = "blocked" if any(str(l).lower() == "blocked" for l in labels) else (
                "active" if "/pull/" in url and not row.get("isDraft") else "next")
            tasks.append({"id": f"{repo}#{row['number']}", "label": row["title"], "status": status,
                          "defect": any(str(l).lower() == "bug" for l in labels), "url": url})
        except (KeyError, TypeError, ValueError):
            notes.append("github: invalid task omitted.")
    return tasks


def _portfolio(home, path, selection, notes):
    config = _get("config", home, notes, {}, path)
    boards = {}
    try:
        products, repos = config["products"], config.get("repos", {})
        if not isinstance(products, list) or not isinstance(repos, dict):
            raise ValueError("invalid work config")
        if len(products) > 64 or len(repos) > 32:
            notes.append("config: product/repository limit reached.")
        task_repos = {}
        for product in products[:64]:
            key = product["id"]
            if selection is not None and key != selection:
                continue
            board = {"label": product.get("name", key), "lead": product.get("lead", "Taste work board"), "products": [], "shared": []}
            board_repos = set()
            board_tasks = []
            for component in product.get("components", [])[:MAX_ROWS]:
                cid = component["id"]
                product_id = f"{key}:{cid}"
                features = []
                for repo_key in list(component.get("paths", {}))[:32]:
                    repo = repos.get(repo_key, {}).get("gh")
                    if not isinstance(repo, str) or not _REPO.fullmatch(repo):
                        notes.append("config: missing or invalid GitHub repository.")
                        continue
                    if repo not in task_repos:
                        task_repos[repo] = _tasks(home, repo, notes)
                    board_repos.add(repo)
                    board_tasks.extend(task_repos[repo])
                    # Preserve feature/action IDs while displaying the repository's name, not a config key.
                    features.append({"id": f"{cid}:{repo_key}", "label": repo[:200],
                                     "horizon": _horizon(component.get("horizon")),
                                     "tasks": deepcopy(task_repos[repo])})
                for other in component.get("also", [])[:64]:
                    shared_id = f"{key}:{cid}"
                    if not any(s["id"] == shared_id for s in board["shared"]):
                        board["shared"].append({"id": shared_id, "label": component.get("name", cid), "owner": product_id})
                    features.append({"id": f"{cid}:also:{other}", "label": f"Also in {other}", "horizon": "now", "owns": [shared_id], "tasks": []})
                if not features:
                    features.append({"id": cid, "label": component.get("name", cid), "horizon": "now", "tasks": []})
                board["products"].append({"id": product_id, "label": component.get("name", cid), "horizon": _horizon(component.get("horizon")), "features": features})
            # One readable portfolio verdict, based on repository-wide tasks; never assign an issue to a path.
            next_task = next((t for t in board_tasks if t["status"] == "blocked"),
                             next((t for t in board_tasks if t["status"] == "next"), None))
            board["lead"] = (f"{len(board_repos)} repositories · "
                             + (f"Next: review {str(next_task['label'])[:80]}" if next_task else "No open tasks to review"))
            boards[key] = board
        if selection is not None and selection not in boards:
            notes.append("portfolio: unknown key.")
        notes.append("GitHub tasks are repository-wide open items; the work config does not assign issues to component paths.")
    except (KeyError, TypeError, ValueError, AttributeError):
        notes.append("config: invalid Taste work board.")
    return {"portfolios": boards}


def _factory_state(text):
    text = str(text).lower()
    if any(s in text for s in ("fail", "down", "broken", "died")):
        return "failing"
    if any(s in text for s in ("block", "hold", "refuse", "needs", "pending_review")):
        return "needs-you"
    if any(s in text for s in ("pass", "done", "posted", "approve")):
        return "done"
    return "idle"


def _factory(home, root, notes):
    ops = _get("ops", home, notes, {}, root)
    stats = {"queue": 0, "depth": 0, "sendsHour": 0, "capHour": 30, "posted": 0, "verifyPass": 0.0}
    if isinstance(ops, dict):
        for k in ("queue", "depth", "sendsHour", "posted"):
            if isinstance(ops.get(k), int) and ops[k] >= 0:
                stats[k] = ops[k]
        notes.extend(ops.get("notes", []))
    else:
        notes.append("ops: invalid source data.")
    verify = _get("verify", home, notes, [], root)
    if isinstance(verify, list):
        verdicts = [str(r.get("verdict", "")) for r in verify if isinstance(r, dict)]
        judged = [v for v in verdicts if v == "pass" or v.startswith("fail")]
        if judged:
            stats["verifyPass"] = judged.count("pass") / len(judged)
        else:
            notes.append("verify: no pass/fail samples available.")
    else:
        notes.append("verify: invalid source data.")
    brain = _get("brain", home, notes, {}, root)
    nodes, edges = [], []
    if not isinstance(brain, dict):
        notes.append("brain: invalid source data.")
        brain = {}

    def add(id_, col, label, kind, state, reason="", url=None):
        if len(nodes) >= MAX_NODES:
            return
        node = {"id": str(id_), "col": col, "label": str(label)[:200], "kind": kind, "state": state, "reason": str(reason)[:200]}
        if url:
            node["url"] = url
        nodes.append(node)
        if id_ != "brain":
            edges.append(["brain", str(id_), "delegated", state == "live"])

    if brain:
        add("brain", 0, "Factory brain", "chat", "idle", f"Snapshot last run: {brain.get('last_run', 'unknown')}")
        lanes = brain.get("verifier_lanes", {})
        if isinstance(lanes, dict):
            for key, value in list(lanes.items())[:30]:
                add(f"lane:{key}", 1, key, "host", _factory_state(value), value)
        # These are the actual brain-state fields, not a fabricated lanes/cards schema.
        for key, values in reversed(list(brain.items())):
            if len(nodes) >= MAX_NODES:
                notes.append("brain: graph capped at 60 nodes.")
                break
            if not (key.endswith("_queued") or key in ("pending_review", "pending_verify", "chat_in_flight", "chat_backlog")) or not isinstance(values, list):
                continue
            for index, value in enumerate(values[:MAX_NODES]):
                add(f"card:{key}:{index}", 2, value.get("tag", value.get("id", key)) if isinstance(value, dict) else value,
                    "subagent", "live" if key == "chat_in_flight" else _factory_state(key), value)
    # The renderer offers a fix action only on the highest-priority observed node.
    # Every other node remains navigable; gold is not a second status colour.
    next_node = next((n for n in nodes if n["state"] == "failing"),
                     next((n for n in nodes if n["state"] == "needs-you"), None))
    if next_node is not None:
        next_node["action"] = "Prepare fix" if next_node["state"] == "failing" else "Review blocker"
    notes.append("Factory graph is a bounded brain-state snapshot, not live lane telemetry. capHour is the configured default of 30.")
    return {"stats": stats, "nodes": nodes, "edges": edges}


def _gauges():
    result = dict.fromkeys(("cpu", "mem", "swap", "disk", "gpu"))
    notes = []
    try:
        result["cpu"] = min(100, float(_read(Path("/proc/loadavg")).split()[0]) / (os.cpu_count() or 1) * 100)
    except (OSError, ValueError, IndexError) as error:
        notes.append(_reason("cpu", error))
    try:
        mem = {line.split(":", 1)[0]: int(line.split()[1]) for line in _read(Path("/proc/meminfo")).splitlines()}
        result["mem"] = (1 - mem["MemAvailable"] / mem["MemTotal"]) * 100
        result["swap"] = (1 - mem["SwapFree"] / mem["SwapTotal"]) * 100 if mem["SwapTotal"] else 0
    except (OSError, ValueError, KeyError, ZeroDivisionError) as error:
        notes.append(_reason("memory", error))
    try:
        disk = shutil.disk_usage("/")
        result["disk"] = disk.used / disk.total * 100
    except (OSError, ZeroDivisionError) as error:
        notes.append(_reason("disk", error))
    try:
        values = [float(v) for v in _command(["nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"]).splitlines()]
        result["gpu"] = sum(values) / len(values) if values else None
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        notes.append(_reason("gpu", error))
    return {**result, "notes": notes}


def _counters(pid):
    try:
        # comm may contain spaces and parentheses; the final ')' ends it in /proc stat.
        fields = _read(Path(f"/proc/{pid}/stat")).rsplit(")", 1)[1].split()
        cpu = int(fields[11]) + int(fields[12])
        io = {k: int(v) for k, v in (line.split(":", 1) for line in _read(Path(f"/proc/{pid}/io")).splitlines())}
        return cpu, io.get("read_bytes", 0) + io.get("write_bytes", 0)
    except (OSError, ValueError, IndexError):
        return None


_HARNESS_NAMES = {name: name for name in ("hermes", "omp", "claude", "codex", "fx", "pi")}
_HARNESS_NAMES["fx-canon"] = "fx"


def _harness(comm, args):
    direct = _HARNESS_NAMES.get(Path(comm).name.lower())
    if direct:
        return direct
    tokens = shlex.shlex(args, posix=True)
    tokens.whitespace_split = True
    tokens.commenters = ""
    try:
        executable = Path(next(tokens, "")).name.lower()
        if executable in _HARNESS_NAMES:
            return _HARNESS_NAMES[executable]
        python = re.fullmatch(r"python(?:\d+(?:\.\d+)*)?", executable)
        if not python and executable not in ("node", "nodejs"):
            return None
        flags = {"-u", "-B", "-E", "-I", "-O", "-OO", "-s", "-S"} if python else {
            "--expose-gc", "--enable-source-maps", "--no-warnings"}
        entrypoint = next(tokens, "")
        while entrypoint in flags:
            entrypoint = next(tokens, "")
        if entrypoint == "--":
            entrypoint = next(tokens, "")
        if python and entrypoint == "-m":
            return {"hermes_cli": "hermes", "hermes_cli.main": "hermes"}.get(next(tokens, ""))
        if not entrypoint or entrypoint.startswith("-"):
            return None
        entrypoint = Path(entrypoint).name.lower()
    except ValueError:
        return None
    for suffix in (".py", ".js", ".mjs", ".cjs"):
        if entrypoint.endswith(suffix):
            entrypoint = entrypoint[:-len(suffix)]
            break
    return _HARNESS_NAMES.get(entrypoint)


def _processes():
    output = _command(["ps", "-eo", "pid=,pcpu=,stat=,etimes=,comm=,args="])
    rows = []
    for line in output.splitlines()[:10000]:
        parts = line.split(None, 5)
        if len(parts) < 5 or not parts[0].isdigit():
            continue
        kind = _harness(parts[4], parts[5] if len(parts) > 5 else "")
        if kind:
            rows.append((*parts[:4], kind))
        if len(rows) >= MAX_ROWS:
            break
    before = {pid: _counters(pid) for pid, *_ in rows}
    if rows:
        time.sleep(.1)
    agents = []
    for pid, cpu, status, elapsed, kind in rows:
        after = _counters(pid)
        sampled = before[pid] is not None and after is not None
        active = sampled and any(b > a for a, b in zip(before[pid], after))
        if "Z" in status:
            state = "offline"
        elif "D" in status or "T" in status:
            state = "blocked"
        else:
            state = "working" if active else "idle"
        signal = "recent CPU/IO activity" if active else "no CPU/IO activity in 100ms sample" if sampled else "recent CPU/IO unavailable"
        agents.append({"kind": "Hermes process" if kind == "hermes" else kind,
                       "id": f"process:{pid}", "name": kind, "state": state,
                       "line": f"Process {pid}, {signal}, status {status}; session identity unavailable",
                       "age": f"{int(elapsed) // 60}m", "model": ""})
    return agents


def _sessions(home):
    path = home / "state.db"
    if not path.is_file():
        raise FileNotFoundError("Hermes state")
    deadline = time.monotonic() + 4
    db = sqlite3.connect(path.absolute().as_uri() + "?mode=ro", uri=True, timeout=1)
    try:
        db.execute("PRAGMA query_only=ON")
        db.set_progress_handler(lambda: int(time.monotonic() >= deadline), 1000)
        cols = {r[1] for r in db.execute("PRAGMA table_info(sessions)")}
        required = {"id", "source", "hidden", "parent_session_id", "model_config", "started_at"}
        if not required <= cols:
            raise ValueError("incompatible Hermes state")
        timestamp = "coalesce(last_activity_at,started_at)" if "last_activity_at" in cols else "started_at"
        title = "substr(title,1,200)" if "title" in cols else "id"
        archived = "AND coalesce(archived,0)=0" if "archived" in cols else ""
        query = f"SELECT id,{title},substr(model_config,1,4096),{timestamp} FROM sessions WHERE hidden=0 AND parent_session_id IS NULL AND source IN ('cli','tui','local','acp','desktop','gui') {archived} AND {timestamp} >= ? ORDER BY {timestamp} DESC LIMIT 100"
        agents = []
        for sid, name, raw, at in db.execute(query, (time.time() - 900,)):
            config = json.loads(raw or "{}")
            if not isinstance(config, dict) or config.get("_delegate_from"):
                continue
            agents.append({"kind": "Hermes", "id": sid, "name": name or sid, "state": "idle",
                           "line": "Recent local Hermes session; activity state unknown",
                           "age": f"{max(0, int(time.time() - at)) // 60}m", "model": str(config.get("model", ""))})
        return agents
    finally:
        db.close()


def _github(repo):
    if not isinstance(repo, str) or not _REPO.fullmatch(repo):
        raise ValueError("invalid repository")
    issues = json.loads(_command(["gh", "issue", "list", "--repo", repo, "--state", "open", "--limit", "20", "--json", "number,title,url,state,labels"]))
    prs = json.loads(_command(["gh", "pr", "list", "--repo", repo, "--state", "open", "--limit", "20", "--json", "number,title,url,state,labels,isDraft"]))
    if not isinstance(issues, list) or not isinstance(prs, list):
        raise ValueError("invalid GitHub response")
    # Interleave so both issues and PRs survive the shared per-repo cap.
    return [row for i in range(20) for rows in (issues, prs) for row in rows[i:i + 1]][:20]


def _timestamp(value):
    if isinstance(value, (float, int)):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()


def _ops(root):
    notes = []
    children = _entries(root, notes)
    directories = [Path(e.path) for e in children if e.is_dir(follow_symlinks=False) and not e.name.startswith((".", "archive"))]
    # One level of run dirs plus the named factory tree; never recursively walk operations.
    runs = [root, *directories]
    factory = root / "factory-loop-1102"
    if factory in directories:
        runs.extend(Path(e.path) for e in _entries(factory, notes) if e.is_dir(follow_symlinks=False) and not e.name.startswith("."))
    result = {"queue": 0, "depth": 0, "sendsHour": 0, "posted": 0, "notes": notes}
    found = set()
    for run in runs:
        queue = run / "queue"
        if not queue.is_symlink() and queue.is_dir() and not any((run / marker).exists() for marker in ("STOP", "DONE", "ARCHIVED")):
            found.add("queue")
            result["queue"] += sum(e.name.endswith(".json") and ".claimed-" not in e.name and e.is_file(follow_symlinks=False) for e in _entries(queue, notes))
        for leaf in ("dispatches.jsonl", "posted.jsonl"):
            path = run / leaf
            if not path.is_file():
                continue
            found.add(leaf)
            try:
                for row in _jsonl(path, notes):
                    if leaf == "posted.jsonl":
                        result["posted"] += row.get("rc") == 0
                    elif row.get("send_attempted") is not False and row.get("send_status") in ("sent", "ok", "success"):
                        try:
                            at = _timestamp(row.get("dispatch_t0", row.get("at", row.get("t"))))
                            result["sendsHour"] += time.time() - 3600 <= at <= time.time()
                        except (ValueError, TypeError, OverflowError):
                            notes.append("dispatches.jsonl: invalid timestamp ignored.")
            except (OSError, ValueError) as error:
                notes.append(_reason(leaf, error))
    result["depth"] = result["queue"]
    for source in ("queue", "dispatches.jsonl", "posted.jsonl"):
        if source not in found:
            notes.append(f"{source}: no source found in bounded active run scan.")
    return result


def _collect(name, home, args):
    if name == "gauges":
        return _gauges()
    if name == "tailscale":
        return json.loads(_command(["tailscale", "status", "--json"]))
    if name == "k3s":
        return json.loads(_command(["kubectl", "--request-timeout=4s", "get", "nodes,pods", "-A", "-o", "json"]))
    if name == "processes":
        return _processes()
    if name == "sessions":
        return _sessions(home)
    if name == "config":
        return json.loads(_read(Path(args[0]).expanduser()))
    if name == "github":
        return _github(args[0])
    if name == "ops":
        return _ops(Path(args[0]).expanduser())
    if name == "brain":
        return json.loads(_read(Path(args[0]).expanduser() / "factory-loop-1102/brain-state.json"))
    if name == "verify":
        notes = []
        rows = _jsonl(Path(args[0]).expanduser() / "factory-loop-1102/hoss12-verify/salvage-verify.jsonl", notes)
        # Preserve ledger quality notes without changing the public verify row format.
        if notes:
            raise ValueError("invalid or truncated verification ledger")
        return rows
    raise ValueError("unknown fleet source")


if __name__ == "__main__":
    _DEADLINE = time.monotonic() + 4.5
    try:
        value = _collect(sys.argv[1], Path(sys.argv[2]), sys.argv[3:])
        encoded = json.dumps(value, allow_nan=False)
        if len(encoded) > MAX_BYTES:
            raise ValueError("source output exceeds size limit")
        print(encoded)
    except (OSError, ValueError, KeyError, TypeError, sqlite3.Error, subprocess.SubprocessError) as error:
        print(json.dumps({"_unavailable": _reason(sys.argv[1], error)}))

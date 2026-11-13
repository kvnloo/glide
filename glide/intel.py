"""Read-only intel.v0 API. Source snapshots run in separate <=5s processes, cached 60s."""
from __future__ import annotations

from collections import OrderedDict
from copy import deepcopy
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import time

from .child_env import child_env

SOURCE_TIMEOUT = 5
CACHE_SECONDS = 60
MAX_BYTES = 1024 * 1024
TABS = ("hill", "skills", "memory", "failures", "trace")
SOURCES = ("climbs", "routes", "memory", "failures", "trace")
_DEFAULT_OPS = Path("/mnt/zer0models/workspace/zer0/data/operations")  # privacy: ok
_DEFAULT_EXPERIMENTS = Path("/mnt/zer0models/zer0-tier/experiments")  # privacy: ok
_CACHE: OrderedDict = OrderedDict()
USAGE = "/intel [--json] [hill|skills|memory|failures|trace] | climb <id> | skill <name> | failure <sig>"


def _config() -> dict:
    ops = Path(os.environ.get("GLIDE_INTEL_OPS", str(_DEFAULT_OPS))).expanduser()
    memory = Path(os.environ.get("GLIDE_INTEL_MEMORY_ROOT", str(Path.home() / ".local/state/z0int"))).expanduser()
    return {
        "ops": str(ops),
        "climbs": os.environ.get("GLIDE_INTEL_CLIMBS", ""),
        "experiments": str(_DEFAULT_EXPERIMENTS),
        "memory": str(memory),
        "events": os.environ.get("GLIDE_INTEL_EVENT_LOG", str(Path.home() / ".z0int/memory/events.jsonl")),
        "packet": os.environ.get("Z0INT_STATE_PACKET", str(memory / "STATE-PACKET.md")),
        "laws": os.environ.get("GLIDE_INTEL_LAWS", str(ops / "intent-analyzer-20261104/goal-laws.json")),
    }


def _source_process(name: str, home: Path, config: dict) -> dict:
    result = subprocess.run(
        [sys.executable, str(Path(__file__).with_name("intel_sources.py").absolute()),
         name, str(home.absolute()), json.dumps(config)],
        capture_output=True, text=True, timeout=SOURCE_TIMEOUT, check=True, env=child_env(),
    )
    if len(result.stdout.encode("utf-8")) > MAX_BYTES:
        raise ValueError("source output exceeds limit")
    value = json.loads(result.stdout)
    if not isinstance(value, dict) or value.get("unavailable"):
        raise ValueError("source unavailable")
    return value


_source = _source_process


def _validated(value: dict) -> dict:
    if not isinstance(value, dict) or not isinstance(value.get("rows"), list):
        raise ValueError("invalid rows")
    if not all(isinstance(row, dict) for row in value["rows"]):
        raise ValueError("invalid row")
    if not isinstance(value.get("notes"), list) or not all(isinstance(n, str) for n in value["notes"]):
        raise ValueError("invalid notes")
    details = value.get("details", {})
    if not isinstance(details, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in details.items()):
        raise ValueError("invalid details")
    # JSON must contain no NaN/Infinity, including from a corrupt local store.
    json.dumps(value, allow_nan=False)
    return {"rows": value["rows"], "notes": [n[:200] for n in value["notes"][:64]], "details": details}


def _snapshot(name: str, home: Path) -> dict:
    config = _config()
    key = (str(home.absolute()), name, json.dumps(config, sort_keys=True))
    cached = _CACHE.get(key)
    if cached and time.monotonic() - cached[0] < CACHE_SECONDS:
        return deepcopy(cached[1])
    try:
        value = _validated(_source(name, home, config))
    except (OSError, ValueError, TypeError, RecursionError, subprocess.SubprocessError) as error:
        reason = "timeout" if isinstance(error, subprocess.TimeoutExpired) else "missing" if isinstance(error, FileNotFoundError) else "unavailable or invalid"
        value = {"rows": [], "notes": [f"{name}: {reason}; source unavailable."], "details": {}}
    if not value["rows"] and not value["notes"]:
        value["notes"].append(f"{name}: no data available in bounded snapshot.")
    _CACHE[key] = (time.monotonic(), deepcopy(value))
    _CACHE.move_to_end(key)
    while len(_CACHE) > 32:
        _CACHE.popitem(last=False)
    return value


def card(home: Path, tab: str = "hill") -> dict:
    """The fixed frontend API. Tabs share source snapshots, never a demo fallback."""
    if tab not in TABS:
        raise ValueError("unknown intel tab")
    data = {"at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "tab": TABS.index(tab), "notes": []}
    for name in SOURCES:
        snapshot = _snapshot(name, home)
        data[name] = snapshot["rows"]
        data["notes"].extend(snapshot["notes"])
    # Presentation guidance only; source snapshots, lookup identities and read bounds stay unchanged.
    guidance = {
        "hill": "Hill climbs: the final point is the latest observed score; the best may be earlier.",
        "skills": "Skill routing: skill loads are not measured routing accuracy.",
        "memory": "Memory: update times show file freshness, not what changed within a file.",
        "failures": "Failed checks: a passing replay is not proof of a permanent fix.",
        "trace": "Sessions: minute buckets mark events, not measured execution durations.",
    }
    data["notes"] = [
        "Read-only local snapshot. Observations are not commands or verified fixes.",
        guidance[tab],
        *dict.fromkeys(data["notes"]),
    ]
    return {"kind": "intel-suite", "app": "glide", "data": data}


def detail(home: Path, action: str, entity: str) -> dict:
    """Lookup only a snapshot-owned ID. No request value is used as a file path or command."""
    source = {"climb": "climbs", "skill": "routes", "failure": "failures"}.get(action)
    unavailable = {"text": "Intel detail unavailable. Refresh /intel and choose an item in the current snapshot."}
    if not source or not isinstance(entity, str) or not 1 <= len(entity) <= 200:
        return unavailable
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_./-]*", entity) or any(p in (".", "..") for p in entity.split("/")):
        return unavailable
    snapshot = _snapshot(source, home)
    text = snapshot["details"].get(entity)
    return {"text": text[:16000]} if text else unavailable


def command(raw_args: str = "", session_id: str | None = None) -> str:
    """Stock ctx.register_command handler, reached through command.dispatch."""
    from .core import _home

    try:
        if len(raw_args or "") > 1024:
            return USAGE
        args = shlex.split(raw_args or "")
        as_json = "--json" in args
        args = [a for a in args if a != "--json"]
        if len(args) == 2 and args[0] in ("climb", "skill", "failure"):
            return json.dumps(detail(_home(), args[0], args[1]), allow_nan=False)
        if len(args) > 1 or (args and args[0] not in TABS):
            return USAGE
        doc = card(_home(), args[0] if args else "hill")
        raw = json.dumps(doc, allow_nan=False)
        return raw if as_json else f"```ephemeral-ui\n{raw}\n```"
    except ValueError:
        return USAGE

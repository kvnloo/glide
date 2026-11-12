"""Bounded stdlib-only intel readers, executed by intel.py, not a gateway or service.

Memory levels use representative deployed stores, not invented index/graph counts:
L0 event ledger, L1 capability index, L2 distilled facts, L4 per-node dossiers,
L5 State Packet. L3 has no independently deployed relations store in the inspected
memory contract. Freshness is file metadata, not retrieval health or model use.
Cadences are display thresholds: L0/L1 24h, L2/L4 7d, L5 2h, matching the live
orientation reader's MAX_AGE_SECONDS. SQLite sizes include WAL metadata.
"""
from __future__ import annotations

from collections import Counter, defaultdict, deque
from datetime import datetime, timezone
import glob
import hashlib
from itertools import islice
import json
import math
import os
from pathlib import Path
import re
import sqlite3
import stat
import sys
import time

MAX_BYTES = 1024 * 1024
MAX_ROWS = 4096
MAX_ENTRIES = 2048
MAX_FILES = 96
MAX_MESSAGES = 20000
_DEADLINE = None


def _note(notes, text):
    text = text[:200]
    if text not in notes and len(notes) < 64:
        notes.append(text)


def _check_time():
    if _DEADLINE is not None and time.monotonic() >= _DEADLINE:
        raise TimeoutError("source deadline")


def _text(value):
    return " ".join(str(value).split())[:200]


def _number(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value)


def _id(kind, value):
    return kind + "-" + hashlib.sha256(value.encode("utf-8")).hexdigest()[:24]


def _read(path, notes, tail=False):
    _check_time()
    fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK | getattr(os, "O_NOFOLLOW", 0))
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode):
            raise ValueError("not a regular file")
        if info.st_size > MAX_BYTES:
            if not tail:
                raise ValueError("file exceeds limit")
            stream.seek(-MAX_BYTES, os.SEEK_END)
            raw = stream.read(MAX_BYTES).split(b"\n", 1)[-1]
            _note(notes, "Source read capped at the latest 1 MiB; counts and series are partial.")
        else:
            raw = stream.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("file exceeds limit")
        return raw.decode("utf-8")


def _json(path, notes):
    return json.loads(_read(path, notes))


def _jsonl(path, notes):
    lines = _read(path, notes, tail=True).splitlines()
    if len(lines) > MAX_ROWS:
        _note(notes, "Source rows capped at the latest 4096; counts and series are partial.")
    rows = []
    for line in lines[-MAX_ROWS:]:
        if not line.strip():
            continue
        try:
            row = json.loads(line)
            if not isinstance(row, dict):
                raise ValueError("not an object")
            rows.append(row)
        except (ValueError, RecursionError):
            _note(notes, "Invalid source rows ignored.")
    return rows


def _files(root, notes, depth=3):
    """Bound the whole tree, not just each directory. Never follow child symlinks."""
    pending = [(root, 0)]
    budget = MAX_ENTRIES
    while pending and budget > 0:
        _check_time()
        directory, level = pending.pop()
        try:
            with os.scandir(directory) as stream:
                entries = list(islice(stream, budget + 1))
        except OSError:
            continue
        if len(entries) > budget:
            _note(notes, "Directory scan capped at 2048 entries; coverage is partial.")
        entries = entries[:budget]
        budget -= len(entries)
        for entry in sorted(entries, key=lambda e: e.name):
            if entry.name.startswith(".") or entry.name in ("cache", "data", "results", "__pycache__", "node_modules"):
                continue
            if entry.is_file(follow_symlinks=False):
                yield Path(entry.path)
            elif level < depth and entry.is_dir(follow_symlinks=False):
                pending.append((Path(entry.path), level + 1))
    if pending:
        _note(notes, "Directory scan capped at 2048 entries; coverage is partial.")


def _result(rows, notes, details=None):
    return {"rows": rows, "notes": notes, "details": details or {}}


def _climbs(home, config):
    notes, rows, details = [], [], {}
    override = config["climbs"]
    if override:
        if "**" in override:
            raise ValueError("recursive climb glob is not bounded")
        roots = list(islice(glob.iglob(os.path.expanduser(override)), MAX_FILES + 1))
    else:
        roots = []
        for parent in (config["ops"], config["experiments"]):
            roots.extend(islice(glob.iglob(str(Path(parent) / "*hillclimb*")), MAX_FILES + 1))
        # Discovered through unified-memory-operations, outside the top-level glob.
        roots.append(str(Path(config["ops"]) / "memory-replay-eval/hillclimb/trials.jsonl"))
    if len(roots) > MAX_FILES:
        _note(notes, "climbs: root scan capped at 96 matches.")
    paths, seen = [], set()
    for raw in sorted(roots[:MAX_FILES]):
        root = Path(raw)
        candidates = [root] if root.is_file() and not root.is_symlink() else _files(root, notes)
        for path in candidates:
            if path.suffix in (".json", ".jsonl") and path not in seen:
                paths.append(path)
                seen.add(path)
                if len(paths) >= MAX_FILES:
                    break
        if len(paths) >= MAX_FILES:
            _note(notes, "climbs: file scan capped at 96; coverage is partial.")
            break

    def add(path, label, metric, points):
        if not isinstance(points, list):
            return
        valid = [p for p in points if _number(p)]
        if len(valid) != len(points):
            _note(notes, "climbs: non-finite or invalid score values ignored.")
        if not valid:
            return
        if len(rows) >= 12:
            _note(notes, "climbs: capped at 12 score series; additional runs are omitted.")
            return
        identity = _id("climb", str(path.absolute()) + "\0" + metric + "\0" + label)
        sample = valid[-64:]
        rows.append({"id": identity, "label": _text(label), "metric": _text(metric),
                     "points": sample, "best": max(valid)})
        details[identity] = f"{_text(label)}\n{str(path.absolute())[:1000]}\n{_text(metric)}\nLast 10 points: {sample[-10:]}"
        if len(valid) > 64:
            _note(notes, "climbs: series show the latest 64 points; best is over the bounded source read.")

    for path in paths:
        try:
            if path.suffix == ".jsonl":
                trials = _jsonl(path, notes)
                groups = defaultdict(list)
                for row in trials:
                    train = row.get("train")
                    if isinstance(train, dict) and _number(train.get("own@3")) and _number(train.get("n")) and train["n"] > 0:
                        groups[_text(row.get("run", path.stem))].append(train["own@3"] / train["n"])
                for run, points in groups.items():
                    add(path, f"{path.parent.name}/{run}", "train own@3 / n", points)
                # calls.jsonl's s is latency, not a score; never chart it as fitness.
            else:
                value = _json(path, notes)
                if not isinstance(value, dict):
                    continue
                if isinstance(value.get("log"), list):
                    points = [r.get("acc", r.get("inc_acc")) for r in value["log"] if isinstance(r, dict)]
                    add(path, f"{path.parent.name}/{value.get('bench', path.stem)}", "validation accuracy", points)
                curves = value.get("curves")
                if isinstance(curves, dict):
                    for name, points in list(curves.items())[:12]:
                        add(path, f"{path.stem}/{name}", "colony fitness", points)
        except (OSError, ValueError, TypeError, RecursionError):
            _note(notes, "climbs: unreadable, oversized or invalid log ignored.")
    if not rows:
        _note(notes, "climbs: no score-per-iteration series available in the bounded run scan.")
    return _result(rows, notes, details)


def _db(home):
    path = home / "state.db"
    if not path.is_file():
        raise FileNotFoundError("Hermes profile state")
    db = sqlite3.connect(path.absolute().as_uri() + "?mode=ro", uri=True, timeout=.5)
    db.execute("PRAGMA query_only=ON")
    deadline = time.monotonic() + 4
    db.set_progress_handler(lambda: int(time.monotonic() >= deadline), 1000)
    return db


def _window(db, notes, name):
    maximum = db.execute("SELECT coalesce(max(id),0) FROM messages").fetchone()[0]
    if maximum > MAX_MESSAGES:
        _note(notes, f"{name}: latest 20000 message IDs only; coverage and counts may be partial.")
    return max(0, maximum - MAX_MESSAGES)


def _skill_name(value):
    return isinstance(value, str) and bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,199}", value)) and value not in (".", "..")


def _description(path, notes):
    lines = _read(path, notes).splitlines()
    if not lines or lines[0].strip() != "---":
        return ""
    for i, line in enumerate(lines[1:100], 1):
        if line.strip() == "---":
            break
        if line.startswith("description:"):
            value = line.partition(":")[2].strip()
            if value in (">", ">-", "|", "|-"):
                continuation = []
                for following in lines[i + 1:i + 65]:
                    if following and not following.startswith((" ", "\t")):
                        break
                    continuation.append(following.strip())
                value = " ".join(continuation)
            elif value.startswith('"'):
                try:
                    value = json.loads(value)
                except ValueError:
                    value = value.strip('"')
            elif value.startswith("'"):
                value = value.strip("'").replace("''", "'")
            return " ".join(str(value).split())[:8000]
    return ""


def _skill_details(home, names, notes):
    details = {}
    pending = deque([(home / "skills", 0)])
    budget = MAX_ENTRIES
    while pending and budget > 0 and names - details.keys():
        _check_time()
        directory, depth = pending.popleft()
        try:
            with os.scandir(directory) as stream:
                entries = list(islice(stream, budget + 1))
        except OSError:
            continue
        if len(entries) > budget:
            _note(notes, "routes: skill directory scan capped at 2048 entries.")
        entries = entries[:budget]
        budget -= len(entries)
        for entry in sorted(entries, key=lambda e: e.name):
            path = Path(entry.path)
            if entry.name.startswith("."):
                continue
            marker = path / "SKILL.md"
            # A selected installed skill may itself be a trusted directory symlink.
            # Do not walk arbitrary linked categories or a skill's references.
            if entry.name in names and marker.is_file():
                try:
                    desc = _description(marker, notes)
                    if desc:
                        details.setdefault(entry.name, entry.name + "\n" + desc)
                except (OSError, ValueError):
                    _note(notes, "routes: skill description unavailable.")
            elif depth < 3 and entry.is_dir(follow_symlinks=False) and not marker.is_file():
                pending.append((path, depth + 1))
    if names - details.keys():
        _note(notes, "routes: some loaded skill descriptions are unavailable in the bounded installed-skill scan.")
    return details


def _routes(home, config):
    notes, counts, details = [], Counter(), {}
    db = _db(home)
    try:
        minimum = _window(db, notes, "routes")
        now = time.time()
        query = """SELECT session_id,tool_call_id,substr(tool_calls,1,65536)
                   FROM messages WHERE id>? AND timestamp>=? AND timestamp<=?
                   AND tool_name='skill_view' ORDER BY id DESC LIMIT 4097"""
        results = list(db.execute(query, (minimum, now - 7 * 86400, now)))
        if len(results) > MAX_ROWS:
            _note(notes, "routes: skill loads capped at 4096; counts are partial.")
        by_session = {}
        for sid, call_id, raw in results[:MAX_ROWS]:
            if sid not in by_session:
                # The real tool rows have NULL tool_calls. Join the call id against
                # bounded assistant calls in the same session, not against result text.
                by_session[sid] = {}
                for (calls,) in db.execute("""SELECT substr(tool_calls,1,65536) FROM messages
                        WHERE session_id=? AND role='assistant' AND tool_calls IS NOT NULL
                        AND id>? ORDER BY id DESC LIMIT 256""", (sid, minimum)):
                    try:
                        value = json.loads(calls)
                        if isinstance(value, list):
                            for call in value[:64]:
                                if isinstance(call, dict) and isinstance(call.get("id"), str):
                                    by_session[sid][call["id"]] = call
                    except (ValueError, TypeError):
                        _note(notes, "routes: invalid assistant tool calls ignored.")
            call = by_session[sid].get(call_id)
            if call is None and raw:
                try:
                    direct = json.loads(raw)
                    call = next((c for c in direct if isinstance(c, dict) and c.get("id") == call_id), None) if isinstance(direct, list) else None
                except ValueError:
                    pass
            try:
                function = call["function"]
                args = function.get("arguments", {})
                args = json.loads(args) if isinstance(args, str) else args
                name = args.get("name")
                if function.get("name") == "skill_view" and _skill_name(name):
                    counts[name] += 1
            except (TypeError, KeyError, AttributeError, ValueError):
                _note(notes, "routes: skill load without usable call arguments ignored.")
        rows = [{"skill": name, "hits": count, "corrected": 0} for name, count in counts.most_common(12)]
        if len(counts) > 12:
            _note(notes, "routes: top 12 loaded skills only.")
    finally:
        db.close()
    names = {r["skill"] for r in rows}
    details = _skill_details(home, names, notes)
    _note(notes, "routes: corrected=0; no cheap per-load owner-corrections attribution is available.")
    _note(notes, "routes: assistant argument lookup capped at 256 calls per session; unmatched loads are omitted.")
    if not rows:
        _note(notes, "routes: no usable skill_view loads in the last 7 days of the bounded profile snapshot.")
    return _result(rows, notes, details)


def _memory(home, config):
    root = Path(config["memory"]).expanduser()
    levels = [
        ("L0", "Raw evidence ledger", Path(config["events"]).expanduser(), 86400),
        ("L1", "Cheap retrieval index", root / "capability-index.sqlite3", 86400),
        ("L2", "Distilled facts", root / "FACTS.jsonl", 7 * 86400),
        ("L4", "Reconciled node dossiers", root / "DOSSIERS.jsonl", 7 * 86400),
        ("L5", "State Packet", Path(config["packet"]).expanduser(), 7200),
    ]
    rows, notes = [], ["memory: L3 relations store unavailable; the memory contract does not establish a separately deployed graph."]
    for level, name, path, cadence in levels:
        try:
            info = path.stat()
            if not stat.S_ISREG(info.st_mode):
                raise ValueError("not a file")
            size, modified = info.st_size, info.st_mtime
            if path.suffix == ".sqlite3":
                wal = Path(str(path) + "-wal")
                if wal.is_file():
                    other = wal.stat()
                    size += other.st_size
                    modified = max(modified, other.st_mtime)
            rows.append({"level": level, "name": name, "size": f"{size} B",
                         "fresh": datetime.fromtimestamp(modified, timezone.utc).isoformat().replace("+00:00", "Z"),
                         "stale": time.time() - modified > cadence})
        except (OSError, ValueError, OverflowError):
            _note(notes, f"memory: {level} {name} source unavailable.")
    _note(notes, "memory: representative local store bytes and mtime only, not full layer coverage, fact counts or successful recall.")
    return _result(rows, notes)


def _failures(home, config):
    notes, rows, details = [], [], {}
    root = Path(config["ops"]) / "token-allocation-20261109"
    state = _json(root / "fix-state.json", notes)
    if not isinstance(state, dict):
        raise ValueError("invalid failure state")
    try:
        rules = _json(Path(config["laws"]).expanduser(), notes).get("rules", {})
        if not isinstance(rules, dict):
            raise ValueError("invalid law registry")
    except (OSError, ValueError, AttributeError):
        rules = {}
        _note(notes, "failures: Bend law coverage registry unavailable.")
    replay = defaultdict(lambda: deque(maxlen=14))
    try:
        for row in _jsonl(root / "fix-replay.jsonl", notes):
            if isinstance(row.get("id"), str) and isinstance(row.get("ok"), bool):
                replay[row["id"]].append("0" if row["ok"] else "1")
    except (OSError, ValueError):
        _note(notes, "failures: replay history unavailable; spark is empty, not fabricated.")
    entries = [(key, value) for key, value in state.items() if isinstance(value, dict)
               and isinstance(value.get("fails"), int) and not isinstance(value.get("fails"), bool) and value["fails"] > 0]
    for key, value in sorted(entries, key=lambda pair: -pair[1]["fails"])[:12]:
        signature = _id("failure", str(root.absolute()) + "\0" + key)
        # fix-replay imports goal-laws as canon-<rule>. Only that exact linkage
        # to a registered Bend law establishes coverage. Never keyword-match a class.
        rule = rules.get(key.removeprefix("canon-"), {}) if key.startswith("canon-") else {}
        law = rule.get("law", "") if isinstance(rule, dict) else ""
        covered = isinstance(law, str) and "bend/" in law
        status = "law" if covered else "fixed" if value.get("ok") is True else "open"
        rows.append({"sig": signature, "source": _text(value.get("cls", "fix-replay")),
                     "spark": "".join(replay[key]), "count": value["fails"], "status": status})
        # Return the ledger entry, not executable tapes or arbitrary command output.
        safe = {k: value[k] for k in ("what", "cls", "fails", "passes", "ok", "since", "checked", "uses", "last_fail_at") if k in value}
        details[signature] = f"fix-state.json / {_text(key)}\n" + json.dumps(safe, indent=2, ensure_ascii=False)[:12000]
        if covered:
            details[signature] += "\nRegistered Bend coverage: " + _text(law)
    _note(notes, "failures: count is recorded failed checks, spark is the latest 14 replay checks. fixed means last check passed, not a verified permanent fix.")
    if len(entries) > 12:
        _note(notes, "failures: top 12 signatures by failed-check count only.")
    if not rows:
        _note(notes, "failures: no recorded failed checks in the local ledger.")
    return _result(rows, notes, details)


def _trace(home, config):
    notes = []
    now = time.time()
    today = datetime.fromtimestamp(now, timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
    db = _db(home)
    try:
        minimum = _window(db, notes, "trace")
        events = list(db.execute("""SELECT session_id,role,timestamp,substr(content,1,8192)
            FROM messages WHERE id>? AND timestamp>=? AND timestamp<=?
            AND role IN ('assistant','tool') ORDER BY timestamp,id LIMIT 4097""", (minimum, today, now)))
    finally:
        db.close()
    if len(events) > MAX_ROWS:
        _note(notes, "trace: first 4096 events in today's bounded snapshot only.")
    events = [e for e in events[:MAX_ROWS] if _number(e[2])]
    lanes = {}
    if events:
        origin = events[0][2]
        count = 0
        for session, role, stamp, content in events:
            lane = _id("session", str(session))
            kind = "m" if role == "assistant" else "t"
            if role == "tool":
                try:
                    value = json.loads(content or "null")
                    if isinstance(value, dict) and (value.get("error") or value.get("success") is False or value.get("is_error") is True):
                        kind = "e"
                except ValueError:
                    pass
            start = int((stamp - origin) // 60)
            spans = lanes.setdefault(lane, [])
            if spans and spans[-1][0] == start and spans[-1][2] == kind:
                continue
            if count >= 200:
                _note(notes, "trace: capped at 200 event buckets; later events omitted.")
                break
            spans.append([start, start + 1, kind])
            count += 1
    _note(notes, "trace: today's UTC profile events, minutes since first event. Buckets mark events, not measured model/tool durations; session IDs are opaque.")
    if not lanes:
        _note(notes, "trace: no assistant or tool events today in the bounded profile snapshot.")
    return _result([{"lane": lane, "spans": spans} for lane, spans in lanes.items()], notes)


def collect(name, home, config):
    return {"climbs": _climbs, "routes": _routes, "memory": _memory,
            "failures": _failures, "trace": _trace}[name](home, config)


if __name__ == "__main__":
    _DEADLINE = time.monotonic() + 4.5
    try:
        value = collect(sys.argv[1], Path(sys.argv[2]), json.loads(sys.argv[3]))
        encoded = json.dumps(value, allow_nan=False)
        if len(encoded.encode("utf-8")) > MAX_BYTES:
            raise ValueError("source output exceeds limit")
        print(encoded)
    except (OSError, ValueError, TypeError, KeyError, RecursionError, sqlite3.Error):
        print(json.dumps({"unavailable": True}))

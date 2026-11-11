"""The attention half of Glide: a focus card, a guarded deep-work block, one wind-down nudge, and
deep-work hours learned from your own local sessions.

Optional sources, each read through its own JSON surface so neither is required:
- `circadian show --json` (z0intelligence's circadian service): phase, next peak, bedtime.
- Flowkit's loopback `GET /v1/state`: a flow likelihood with confidence. Never raw heart data.
Without them Glide learns peak hours and a usual stop time from Hermes session timestamps alone.

State lives in <profile>/glide/attention.json. Nothing leaves the machine. Flow likelihood is an
estimate, not a diagnosis.
"""

from __future__ import annotations

import json
import os
import shutil
import sqlite3
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path

from . import source

FLOWKIT_URL = "http://127.0.0.1:8787/v1/state"
_DAY_STARTS = 5  # Activity before 05:00 belongs to the previous day (late nights, not early mornings).
_LEARN_DAYS = 30
_BUSY = 3  # User messages in one clock hour that count that hour as worked on that day.
_GUARDED = frozenset({"PEAK", "WIND_DOWN", "PRE_SLEEP", "SLEEP"})  # Phases that batch non-critical asks.
_EVENING = frozenset({"WIND_DOWN", "PRE_SLEEP", "SLEEP"})
CLASSES = ("critical", "decision", "report", "digest")


def _path(home: Path) -> Path:
    return home / "glide" / "attention.json"


def load(home: Path) -> dict:
    try:
        state = json.loads(_path(home).read_text())
    except (OSError, ValueError):
        return {"block": None, "queue": [], "resume": None, "nudged": ""}
    return state if isinstance(state, dict) else {"block": None, "queue": [], "resume": None, "nudged": ""}


def save(home: Path, state: dict) -> None:
    path = _path(home)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=1))
    os.replace(tmp, path)


def _run(argv: list[str]) -> str | None:
    from .core import _run as run  # One subprocess policy for the plugin.

    return run(argv, timeout=3)


def circadian(now: datetime | None = None) -> dict | None:
    """Phase, next peak and bedtime from `circadian show --json`; None when it is absent or fails."""
    exe = shutil.which("circadian")
    if not exe:
        return None
    at = ["--at", now.isoformat()] if now else []
    try:
        posture = json.loads(_run([exe, *at, "show", "--json"]) or "")
        local, decision = posture["local"], posture.get("decision", {})
        return {"phase": local["phase"], "next_peak": local.get("nextPeakAt"), "bed": local.get("bedTarget"),
                "batch": decision.get("batchWindow"), "cap": decision.get("interruptCapPerBlock"), "source": "circadian"}
    except (ValueError, KeyError, TypeError):
        return None


def flowkit(url: str | None = None) -> dict | None:
    """Flowkit's flow likelihood when its loopback service answers with a live estimate; else None."""
    try:
        with urllib.request.urlopen(url or os.environ.get("GLIDE_FLOWKIT_URL", FLOWKIT_URL), timeout=1) as reply:
            state = json.loads(reply.read(65536))
        estimate = state["estimate"]
        if state.get("status") != "live" or estimate.get("insufficient_signal") or estimate.get("flow") is None:
            return None
        return {"flow": round(float(estimate["flow"]), 2), "confidence": round(float(estimate["confidence"]), 2),
                "state": estimate.get("state")}
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        return None


def _user_times(home: Path, since: float) -> list[float]:
    path = home / "state.db"
    if not path.exists():
        return []
    sources = sorted(source.LOCAL_SOURCES)
    marks = ",".join("?" for _ in sources)
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=5)
    try:
        rows = con.execute(
            f"""SELECT m.timestamp FROM messages m JOIN sessions s ON s.id = m.session_id
                WHERE m.role = 'user' AND s.source IN ({marks}) AND m.timestamp >= ?""",
            (*sources, since)).fetchall()
    except sqlite3.Error:
        return []
    finally:
        con.close()
    return [r[0] for r in rows if isinstance(r[0], (int, float))]


def learn(home: Path, now: datetime) -> dict:
    """Your best deep-work hours and usual stop time, from your own local session timestamps.

    An hour counts on a day when you sent at least three messages in it; the best window is the
    two-hour span worked on the most days. Deterministic for a given history and `now`."""
    tz = now.tzinfo
    worked: dict[str, Counter] = defaultdict(Counter)
    for ts in _user_times(home, (now - timedelta(days=_LEARN_DAYS)).timestamp()):
        at = datetime.fromtimestamp(ts, tz)
        worked[(at - timedelta(hours=_DAY_STARTS)).date().isoformat()][at.hour] += 1
    days = len(worked)
    if days == 0:
        return {"days": 0, "windows": [], "stop": None, "source": "no local sessions yet"}
    score = Counter()
    for hours in worked.values():
        for hour, count in hours.items():
            if count >= _BUSY:
                score[hour] += 1
    spans = sorted(((score[h] + score[(h + 1) % 24], score[h], -h, h) for h in range(24)), reverse=True)
    windows: list[dict] = []
    for total, _first, _neg, hour in spans:
        if total == 0 or len(windows) == 2:
            break
        if all(abs(((hour - w["start"]) + 12) % 24 - 12) >= 2 for w in windows):
            windows.append({"start": hour, "end": (hour + 2) % 24, "days": total})
    # Usual stop: the median of each day's last active hour, on the day clock that starts at 05:00.
    lasts = sorted((max(hours) - _DAY_STARTS) % 24 for hours in worked.values())
    stop = (lasts[len(lasts) // 2] + _DAY_STARTS + 1) % 24
    return {"days": days, "windows": windows, "stop": stop, "source": "your Hermes sessions"}


def _clock(hour: int) -> str:
    return f"{hour:02d}:00"


def _next_window(windows: list[dict], now: datetime) -> str | None:
    if not windows:
        return None
    ahead = sorted(windows, key=lambda w: ((w["start"] - now.hour) % 24, w["start"]))
    current = [w for w in windows if (now.hour - w["start"]) % 24 < 2]
    w = current[0] if current else ahead[0]
    return ("now, until " if current else "") + f"{_clock(w['start'])}–{_clock(w['end'])}"


def _fallback_phase(learned: dict, now: datetime) -> str:
    """Without circadian: inside a learned window is PEAK; the hour before the usual stop is
    WIND_DOWN; from the stop until 05:00 is SLEEP; otherwise WAKE."""
    if any((now.hour - w["start"]) % 24 < 2 for w in learned["windows"]):
        return "PEAK"
    stop = learned["stop"]
    if stop is None:
        return "WAKE"
    if (now.hour - stop) % 24 < (_DAY_STARTS - stop) % 24 or now.hour == stop:
        return "SLEEP"
    if (stop - now.hour) % 24 == 1:
        return "WIND_DOWN"
    return "WAKE"


def _active_block(state: dict, now: datetime) -> dict | None:
    block = state.get("block")
    return block if block and block.get("end", 0) > now.timestamp() else None


def focus(home: Path, now: datetime | None = None, *, posture: dict | None | bool = True,
          flow: dict | None | bool = True) -> dict:
    """Everything the focus card shows. `posture`/`flow` default to reading the live sources."""
    at, now = now, now or datetime.now().astimezone()
    learned = learn(home, now)
    posture = circadian(at) if posture is True else posture
    flow = flowkit() if flow is True else flow
    state = load(home)
    block = _active_block(state, now)
    phase = posture["phase"] if posture else _fallback_phase(learned, now)
    bed = posture.get("bed") if posture else None
    if not bed and learned["stop"] is not None:
        bed = _clock(learned["stop"])
    return {
        "phase": phase,
        "phase_source": "circadian" if posture else learned["source"],
        "flow": flow,
        "next_window": _next_window(learned["windows"], now) or (posture or {}).get("next_peak"),
        "bedtime": bed,
        "block": {"until": datetime.fromtimestamp(block["end"], now.tzinfo).strftime("%H:%M"),
                  "minutes_left": max(0, round((block["end"] - now.timestamp()) / 60))} if block else None,
        "guarded": bool(block) or phase in _GUARDED,
        "queued": len(state.get("queue", [])),
        "learned": learned,
        "resume": state.get("resume"),
    }


def start_block(home: Path, minutes: int, now: datetime | None = None) -> dict:
    now = now or datetime.now().astimezone()
    state = load(home)
    state["block"] = {"start": now.timestamp(), "end": (now + timedelta(minutes=minutes)).timestamp(), "minutes": minutes}
    save(home, state)
    return focus(home, now, posture=None, flow=None) | {"started": minutes}


def stop_block(home: Path, now: datetime | None = None) -> dict:
    """End the block and release everything it held as one digest."""
    now = now or datetime.now().astimezone()
    state = load(home)
    held, state["block"], state["queue"] = state.get("queue", []), None, []
    save(home, state)
    return {"digest": held, "count": len(held)}


def route(home: Path, title: str, body: str = "", cls: str = "report", now: datetime | None = None,
          *, posture: dict | None | bool = True) -> dict:
    """Deliver now or hold for the digest. Critical always passes; during a block or a guarded
    circadian phase everything else waits."""
    if cls not in CLASSES:
        raise ValueError(f"cls must be one of {', '.join(CLASSES)}")
    at, now = now, now or datetime.now().astimezone()
    state = load(home)
    block = _active_block(state, now)
    if block is None and state.get("block"):  # The block ran out: release on the next event.
        released = stop_block(home, now)
        state = load(home)
    else:
        released = None
    posture = circadian(at) if posture is True else posture
    phase = (posture or {}).get("phase") or ""
    if cls == "critical" or not (block or phase in _GUARDED):
        return {"deliver": True, "queued": len(state["queue"]), "released": released}
    state["queue"].append({"title": title[:200], "body": body[:1000], "cls": cls, "at": now.timestamp()})
    save(home, state)
    why = "deep-work block" if block else f"{phase.lower().replace('_', ' ')} phase"
    return {"deliver": False, "queued": len(state["queue"]), "reason": why, "released": released}


def _last_session(home: Path, exclude: str = "") -> dict | None:
    path = home / "state.db"
    if not path.exists():
        return None
    sources = sorted(source.LOCAL_SOURCES)
    marks = ",".join("?" for _ in sources)
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=5)
    try:
        has_title = any(c[1] == "title" for c in con.execute("PRAGMA table_info(sessions)"))
        row = con.execute(
            f"""SELECT s.id, {'s.title' if has_title else "''"} FROM sessions s WHERE s.source IN ({marks}) AND s.id != ?
                AND EXISTS (SELECT 1 FROM messages m WHERE m.session_id = s.id AND m.role = 'user')
                ORDER BY s.started_at DESC LIMIT 1""", (*sources, exclude)).fetchone()
        if not row:
            return None
        asks = [r[0] for r in con.execute(
            "SELECT content FROM messages WHERE session_id = ? AND role = 'user' AND content IS NOT NULL "
            "ORDER BY timestamp DESC LIMIT 3", (row[0],)).fetchall()]
    except sqlite3.Error:
        return None
    finally:
        con.close()
    return {"session_id": row[0], "title": row[1] or "", "last_asks": [a.strip()[:160] for a in reversed(asks)]}


def wind_down(home: Path, now: datetime | None = None, session_id: str = "", *, force: bool = False,
              posture: dict | None | bool = True) -> dict:
    """At most one nudge per night: save where you left off so tomorrow's first turn starts there."""
    at, now = now, now or datetime.now().astimezone()
    tonight = (now - timedelta(hours=_DAY_STARTS)).date().isoformat()
    state = load(home)
    posture = circadian(at) if posture is True else posture
    phase = (posture or {}).get("phase") or _fallback_phase(learn(home, now), now)
    if not force and (phase not in _EVENING or state.get("nudged") == tonight):
        return {"nudge": False, "phase": phase, "already": state.get("nudged") == tonight}
    last = _last_session(home, session_id)
    state["resume"] = {"saved": now.timestamp(), "night": tonight, **(last or {"title": "", "last_asks": []}),
                       "queued": len(state.get("queue", []))}
    state["nudged"] = tonight
    save(home, state)
    return {"nudge": True, "phase": phase, "bedtime": (posture or {}).get("bed"), "resume": state["resume"]}


def take_resume(home: Path, now: datetime | None = None) -> dict | None:
    """The saved resume note, once, on the first turn of the next day; then it is cleared."""
    now = now or datetime.now().astimezone()
    state = load(home)
    resume = state.get("resume")
    if not resume or resume.get("night") == (now - timedelta(hours=_DAY_STARTS)).date().isoformat():
        return None
    state["resume"] = None
    save(home, state)
    return resume


def turn_context(home: Path, now: datetime | None = None) -> str | None:
    """What the per-turn hook adds: the resume note on the morning's first turn, and the guard rules
    while a deep-work block runs."""
    now = now or datetime.now().astimezone()
    parts = []
    resume = take_resume(home, now)
    if resume:
        asks = "; ".join(resume.get("last_asks") or []) or "(no messages saved)"
        parts.append(f"Where the user left off last night (session \"{resume.get('title') or resume.get('session_id', '')}\"): "
                     f"{asks}. Offer to pick this up.")
    block = _active_block(load(home), now)
    if block:
        until = datetime.fromtimestamp(block["end"], now.tzinfo).strftime("%H:%M")
        parts.append(f"The user is in a deep-work block until {until}. Keep replies short, do not ask "
                     "non-critical questions or open side topics; collect them for the end of the block.")
    return "\n".join(parts) or None


USAGE = """/glide focus              phase, flow likelihood, next deep-work window, bedtime
/glide focus start [min]  start a guarded deep-work block (default 50 min)
/glide focus stop         end the block and show what was held
/glide focus wind-down    save where you left off for tomorrow
/glide focus hours        your best deep-work hours, learned from your sessions"""


def render(card: dict) -> str:
    flow = card["flow"]
    lines = [f"Phase: {card['phase'].replace('_', ' ').title()} ({card['phase_source']})",
             f"Flow likelihood: {flow['flow']:.0%} (confidence {flow['confidence']:.0%}, estimate, not diagnosis)"
             if flow else "Flow likelihood: no wearable signal",
             f"Next deep-work window: {card['next_window'] or 'not learned yet'}",
             f"Bedtime: {card['bedtime'] or 'unknown'}",
             f"Deep-work block: until {card['block']['until']}" if card["block"] else "Deep-work block: off",
             f"Held for later: {card['queued']}"]
    return "\n".join(lines)


def command(home: Path, rest: str, session_id: str = "") -> str:
    verb, _, arg = rest.strip().partition(" ")
    if verb in ("", "show"):
        return render(focus(home)) + "\n\n" + USAGE
    if verb == "start":
        minutes = int(arg) if arg.strip().isdigit() else 50
        card = start_block(home, max(5, min(minutes, 240)))
        return f"Deep-work block on until {card['block']['until']}. Non-critical asks wait for the end."
    if verb == "stop":
        out = stop_block(home)
        return "Block ended. Held: " + (", ".join(i["title"] for i in out["digest"]) or "nothing")
    if verb in ("wind-down", "winddown"):
        out = wind_down(home, session_id=session_id, force=True)
        asks = "; ".join(out["resume"].get("last_asks") or []) or "nothing yet"
        return f"Time to wrap. Saved where you left off: {asks}"
    if verb == "hours":
        learned = learn(home, datetime.now().astimezone())
        spans = ", ".join(f"{_clock(w['start'])}–{_clock(w['end'])} ({w['days']} day-hours)" for w in learned["windows"])
        return f"Best deep-work hours over {learned['days']} days: {spans or 'not enough history yet'}"
    return USAGE

"""/glide focus: phase, guarded deep-work block, one wind-down nudge, learned hours. Fixtures only:
recorded `circadian show --json` postures and a synthetic session history; no network."""

import importlib.util
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from glide_plugin import attention, core, gateway

_spec = importlib.util.spec_from_file_location("_glide_memory_fixtures_att", Path(__file__).with_name("test_memory.py"))
_fixtures = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_fixtures)

FIXTURES = Path(__file__).with_name("fixtures")
TZ = timezone(timedelta(hours=-6))


def at(day: int, hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 11, day, hour, minute, tzinfo=TZ)


def posture(name: str) -> dict:
    """What `attention.circadian` makes of a recorded `circadian show --json`."""
    raw = (FIXTURES / f"circadian-{name}.json").read_text()
    exe = "/fake/circadian"
    calls = []

    def fake_run(argv):
        calls.append(argv)
        return raw
    mp = pytest.MonkeyPatch()
    mp.setattr(attention.shutil, "which", lambda name: exe)
    mp.setattr(attention, "_run", fake_run)
    try:
        return attention.circadian(at(11, 10))
    finally:
        mp.undo()


@pytest.fixture
def home(tmp_path, monkeypatch):
    """Ten days of synthetic history: deep work 09:00-11:00 every day, a little at 15:00, last
    message near 23:00; one older session titled with yesterday's task."""
    home = tmp_path / "hermes"
    db = _fixtures.make_database(home)
    db.execute("ALTER TABLE sessions ADD COLUMN title TEXT")
    for d in range(1, 11):
        sid = f"s{d}"
        db.execute("INSERT INTO sessions (id, source, started_at, title) VALUES (?, 'cli', ?, ?)",
                   (sid, at(d, 9).timestamp(), f"day {d} work"))
        stamps = [at(d, 9, m) for m in (0, 10, 20, 40)] + [at(d, 10, m) for m in (5, 25, 45)]
        stamps += [at(d, 15, 0), at(d, 22, 50)]
        for i, ts in enumerate(stamps):
            db.execute("INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, 'user', ?, ?)",
                       (sid, f"day {d} ask {i}", ts.timestamp()))
    db.execute("INSERT INTO sessions (id, source, started_at, title) VALUES ('cronjob', 'cron', ?, 'cron')",
               (at(10, 23).timestamp(),))
    db.execute("INSERT INTO messages (session_id, role, content, timestamp) VALUES ('cronjob', 'user', 'x', ?)",
               (at(10, 23).timestamp(),))
    db.commit()
    db.close()
    monkeypatch.setattr(attention.shutil, "which", lambda name: None)  # no live circadian on the test host
    monkeypatch.setattr(attention, "flowkit", lambda url=None: None)
    monkeypatch.setattr(core, "_home", lambda: home)
    return home


def test_circadian_fixtures_parse_to_phase_and_bedtime():
    assert posture("peak")["phase"] == "PEAK"
    wind = posture("wind_down")
    assert wind["phase"] == "WIND_DOWN" and wind["bed"].startswith("2026-11-12T02:30")
    assert posture("dip")["phase"] == "DIP" and posture("sleep")["phase"] == "SLEEP"


def test_learns_best_hours_and_stop_time_from_local_sessions_only(home):
    learned = attention.learn(home, at(11, 8))
    assert learned["days"] == 10
    assert learned["windows"][0] == {"start": 9, "end": 11, "days": 20}
    assert learned["stop"] == 23  # Last active hour 22 -> usual stop 23:00.
    assert attention.learn(home, at(11, 8)) == learned  # deterministic


def test_focus_card_without_circadian_uses_learned_hours(home):
    card = attention.focus(home, at(11, 9, 30), posture=None, flow=None)
    assert card["phase"] == "PEAK" and card["phase_source"] == "your Hermes sessions"
    assert card["next_window"] == "now, until 09:00–11:00"
    assert card["bedtime"] == "23:00" and card["guarded"] and card["flow"] is None
    later = attention.focus(home, at(11, 13), posture=None, flow=None)
    assert later["phase"] == "WAKE" and later["next_window"] == "09:00–11:00" and not later["guarded"]
    assert attention.focus(home, at(11, 22, 10), posture=None, flow=None)["phase"] == "WIND_DOWN"
    assert attention.focus(home, at(12, 1), posture=None, flow=None)["phase"] == "SLEEP"


def test_focus_card_prefers_circadian_and_shows_flow_without_raw_biometrics(home):
    flow = {"flow": 0.72, "confidence": 0.6, "state": "flow"}
    card = attention.focus(home, at(11, 13), posture=posture("peak"), flow=flow)
    assert card["phase"] == "PEAK" and card["phase_source"] == "circadian" and card["flow"] == flow
    text = attention.render(card)
    assert "72%" in text and "not diagnosis" in text and "bpm" not in text.lower()


def test_flowkit_reads_only_a_live_estimate(monkeypatch):
    class Reply:
        def __init__(self, body):
            self.body = json.dumps(body).encode()

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def read(self, n):
            return self.body
    live = {"status": "live", "estimate": {"flow": 0.814, "confidence": 0.55, "state": "flow", "insufficient_signal": False}}
    monkeypatch.setattr(attention.urllib.request, "urlopen", lambda url, timeout: Reply(live))
    assert attention.flowkit("http://127.0.0.1:1/v1/state") == {"flow": 0.81, "confidence": 0.55, "state": "flow"}
    weak = {"status": "insufficient_signal", "estimate": {"flow": None, "confidence": 0.1, "insufficient_signal": True}}
    monkeypatch.setattr(attention.urllib.request, "urlopen", lambda url, timeout: Reply(weak))
    assert attention.flowkit("http://127.0.0.1:1/v1/state") is None

    def down(url, timeout):
        raise OSError("refused")
    monkeypatch.setattr(attention.urllib.request, "urlopen", down)
    assert attention.flowkit("http://127.0.0.1:1/v1/state") is None


def test_block_holds_non_critical_asks_and_releases_one_digest(home):
    attention.start_block(home, 50, at(11, 9))
    assert attention.route(home, "PR #12 ready for review", cls="decision", now=at(11, 9, 10), posture=None)["deliver"] is False
    assert attention.route(home, "nightly eval done", cls="report", now=at(11, 9, 20), posture=None)["queued"] == 2
    critical = attention.route(home, "prod is down", cls="critical", now=at(11, 9, 25), posture=None)
    assert critical["deliver"] is True and critical["queued"] == 2
    card = attention.focus(home, at(11, 9, 30), posture=None, flow=None)
    assert card["block"] == {"until": "09:50", "minutes_left": 20, "minutes": 50} and card["queued"] == 2
    out = attention.stop_block(home, at(11, 9, 50))
    assert [i["title"] for i in out["digest"]] == ["PR #12 ready for review", "nightly eval done"]
    assert attention.route(home, "after", now=at(11, 13), posture=None)["deliver"] is True


def test_expired_block_releases_on_next_event_and_circadian_peak_still_guards(home):
    attention.start_block(home, 30, at(11, 9))
    attention.route(home, "held", now=at(11, 9, 5), posture=None)
    after = attention.route(home, "ping", now=at(11, 13), posture=None)
    assert after["deliver"] is True and [i["title"] for i in after["released"]["digest"]] == ["held"]
    guarded = attention.route(home, "ping", now=at(11, 13), posture=posture("peak"))
    assert guarded == {"deliver": False, "queued": 1, "reason": "peak phase", "released": None}
    with pytest.raises(ValueError):
        attention.route(home, "x", cls="urgent", posture=None)


def test_wind_down_nudges_once_per_night_and_resume_quotes_once_next_morning(home):
    night = attention.wind_down(home, at(11, 22, 10), posture=posture("wind_down"))
    assert night["nudge"] is True and night["bedtime"].startswith("2026-11-12T02:30")
    assert night["resume"]["title"] == "day 10 work"
    assert night["resume"]["last_asks"] == ["day 10 ask 6", "day 10 ask 7", "day 10 ask 8"]
    assert attention.wind_down(home, at(11, 23, 30), posture=posture("wind_down"))["nudge"] is False
    assert attention.wind_down(home, at(12, 1), posture=posture("sleep"))["nudge"] is False  # same night
    assert attention.wind_down(home, at(11, 13), posture=posture("peak"))["nudge"] is False
    assert attention.turn_context(home, at(11, 23, 45)) is None  # not before tomorrow
    morning = attention.turn_context(home, at(12, 9, 5))
    assert "left off last night" in morning and "day 10 ask 8" in morning
    assert attention.turn_context(home, at(12, 9, 6)) is None  # once


def test_hook_adds_block_rules_without_memory_enabled(home):
    attention.start_block(home, 60)
    out = core.pre_llm_call(user_message="refactor the parser")
    assert "deep-work block until" in out["context"] and "Your past corrections" not in out["context"]
    attention.stop_block(home)
    assert core.pre_llm_call(user_message="refactor the parser") is None


def test_gateway_focus_and_route_verbs(home):
    started = gateway.call(home, "focus", {"session_id": "s", "action": "start", "minutes": 25})
    assert started["block"]["minutes_left"] == 25 and started["guarded"]
    held = gateway.call(home, "route", {"session_id": "s", "title": "review PR", "cls": "decision"})
    assert held["deliver"] is False and held["reason"] == "deep-work block"
    stopped = gateway.call(home, "focus", {"session_id": "s", "action": "stop"})
    assert stopped["count"] == 1 and stopped["block"] is None and stopped["queued"] == 0
    wound = gateway.call(home, "focus", {"session_id": "s", "action": "wind_down"})
    assert wound["wind_down"]["nudge"] is True and wound["resume"]["title"]
    with pytest.raises(Exception):
        gateway.call(home, "focus", {"session_id": "s", "action": "nap"})


def test_slash_command_text(home):
    assert "Phase:" in core.command("focus") and "/glide focus start" in core.command("focus")
    assert "until" in core.command("focus start 30")
    assert core.command("focus stop").startswith("Block ended")
    assert "09:00–11:00" in core.command("focus hours") or "Best deep-work hours" in core.command("focus hours")
    assert "/glide focus" in core.command("help")

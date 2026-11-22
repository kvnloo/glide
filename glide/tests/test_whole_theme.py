"""glide_theme (GL-062): the theme table, the day/night pairs, the switch written beside `ui`, and the pane's
verdict the tool waits on."""

from __future__ import annotations

import json
import threading
import time
import types

from glide_plugin import ui, whole_theme

NEW = ("light", "dark-code", "sepia", "warm-dark", "day", "night")
KEYS = {"label", "detail", "phase", "pair", "bg", "fg", "accent", "muted", "dim", "error", "success", "warning",
        "info", "magenta", "cyan"}


def _lum(h: str) -> float:
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def _contrast(a: str, b: str) -> float:
    hi, lo = sorted((_lum(a), _lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def _pane(home, wear):
    """A Glide pane: answers each new rev with the theme it now wears (`wear(mode in settings.json)`)."""
    stop = threading.Event()

    def run():
        seen = 0
        while not stop.is_set():
            data = ui._read(ui.settings_file(home))
            rev = (data.get("ui") or {}).get("rev", 0)
            if rev > seen:
                seen = rev
                ui.status_file(home).write_text(json.dumps({"rev": rev, "widgets": {}, **wear(data.get("theme"))}))
            time.sleep(0.02)

    threading.Thread(target=run, daemon=True).start()
    return stop


def test_the_table_holds_the_new_themes_as_day_night_pairs_with_readable_inks():
    themes = whole_theme.table()
    assert tuple(themes) == NEW
    for name, t in themes.items():
        assert set(t) == KEYS, name
        partner = themes[t["pair"]]
        assert partner["pair"] == name and {t["phase"], partner["phase"]} == {"day", "night"}, name
        for ink in ("fg", "accent", "muted", "dim", "error", "success", "warning", "info", "magenta", "cyan"):
            assert _contrast(t[ink], t["bg"]) >= 4.5, (name, ink)
    assert set(whole_theme.SCHEMA["parameters"]["properties"]["theme"]["enum"]) == {*NEW, *whole_theme.BUILTIN}


def test_resolve_moves_a_theme_to_its_pair_for_the_phase():
    r = whole_theme.resolve
    assert r("tern", "sepia", None) == "sepia"
    assert r("sepia", None, "night") == "warm-dark"
    assert r("warm-dark", None, "night") == "warm-dark"
    assert r("warm-dark", None, "flip") == "sepia"
    assert r("tern", "light", "night") == "dark-code"
    assert r("night", None, "day") == "day"
    # Outside the table there is no pair: a phase lands on day/night, and flip from Dash's night is day.
    assert r("tern", None, "night") == "night"
    assert r("auto", None, "flip") == "night" and r("dash", None, "flip") == "day"


def test_switch_writes_the_theme_beside_ui_and_waits_for_the_pane(tmp_path):
    home = tmp_path / "hermes"
    ui.style(home, {"warmth": 0.4}, wait=0)
    stop = _pane(home, lambda mode: {"theme": {"ok": True, "mode": mode}})
    try:
        out = whole_theme.switch(home, {"theme": "sepia"}, wait=2)
        flipped = whole_theme.switch(home, {"phase": "flip"}, wait=2)
    finally:
        stop.set()
    assert out == {"ok": True, "theme": "sepia", "phase": "day", "pair": "warm-dark", "checked": True}
    assert flipped == {"ok": True, "theme": "warm-dark", "phase": "night", "pair": "sepia", "checked": True}
    data = json.loads(ui.settings_file(home).read_text())
    # The same key the /theme picker keeps, and the agent's style survives the switch.
    assert data["theme"] == "warm-dark" and data["ui"]["style"] == {"warmth": 0.4} and data["ui"]["rev"] == 3


def test_switch_reports_what_the_pane_says():
    def run(answer, args):
        import tempfile
        from pathlib import Path

        home = Path(tempfile.mkdtemp()) / "hermes"
        stop = _pane(home, answer)
        try:
            return whole_theme.switch(home, args, wait=2)
        finally:
            stop.set()

    bad = run(lambda mode: {"theme": {"ok": False, "mode": mode, "problems": ["muted 3.9:1"]}}, {"theme": "night"})
    assert bad["ok"] is False and bad["problems"] == ["muted 3.9:1"]
    stale = run(lambda mode: {"theme": {"ok": True, "mode": "tern"}}, {"theme": "light"})
    assert stale["ok"] is False and stale["problems"] == ["the pane wears 'tern'"]
    old = run(lambda mode: {}, {"theme": "day"})
    assert old["ok"] is True and old["checked"] is False


def test_switch_validates_and_saves_without_a_pane(tmp_path):
    home = tmp_path / "hermes"
    assert "error" in whole_theme.switch(home, {}, wait=0)
    assert "error" in whole_theme.switch(home, {"theme": "neon"}, wait=0)
    assert "error" in whole_theme.switch(home, {"phase": "dusk"}, wait=0)
    out = whole_theme.switch(home, {"theme": "dash"}, wait=0)
    assert out == {"ok": True, "theme": "dash", "checked": False, "note": out["note"]}
    assert whole_theme.current(home) == "dash"


def test_window_themes_map_dashs_tokens_over_each_theme():
    dash = json.loads(whole_theme.DASH.read_text())
    files = whole_theme.omp_themes()
    assert sorted(files) == sorted(f"glide-{n}.json" for n in NEW)
    sepia = json.loads(files["glide-sepia.json"])
    assert sepia["name"] == "glide-sepia" and sepia["colors"] == dash["colors"]
    assert sepia["vars"]["background"] == "#f3ead6" and sepia["vars"]["primary"] == "#97522a"
    for key, ref in sepia["colors"].items():
        assert ref in sepia["vars"], key


def test_register_adds_the_theme_tool():
    tools = {}
    ctx = types.SimpleNamespace(register_tool=lambda **kw: tools.__setitem__(kw["name"], kw))
    whole_theme.register(ctx)
    assert list(tools) == ["glide_theme"] and tools["glide_theme"]["toolset"] == "glide"
    assert "phase" in tools["glide_theme"]["schema"]["parameters"]["properties"]

"""glide_ui_mount / _unmount / _style and `/glide ui` (kvnloo/glide#326): state in settings.json's `ui`,
the open pane's verdict read from ui-status.json, and a mount the pane rejects taken back out."""

from __future__ import annotations

import json
import threading
import time
import types

import glide_plugin as plugin
import glide_plugin.core  # noqa: F401  (plugin.core)
from glide_plugin import ui

COMMITS = 'root = GlideCard("commits", [Graphic("heat"), Stats("stats")])'


def _home(tmp_path):
    return tmp_path / "hermes"


def _pane(home, verdict):
    """A Glide pane: answers each new rev in settings.json with `verdict(widget ids)`."""
    stop = threading.Event()

    def run():
        seen = 0
        while not stop.is_set():
            data = ui._read(ui.settings_file(home)).get("ui") or {}
            rev = data.get("rev", 0)
            if rev > seen:
                seen = rev
                ids = [w["id"] for w in data.get("widgets", [])]
                ui.status_file(home).write_text(json.dumps({"rev": rev, **verdict(ids)}))
            time.sleep(0.02)

    threading.Thread(target=run, daemon=True).start()
    return stop


def test_mount_keeps_other_settings_and_waits_for_the_pane(tmp_path):
    home = _home(tmp_path)
    ui.settings_file(home).parent.mkdir(parents=True)
    ui.settings_file(home).write_text(json.dumps({"theme": "auto"}))
    stop = _pane(home, lambda ids: {"widgets": {i: {"ok": True} for i in ids}, "style": {"ok": True}})
    try:
        out = ui.mount(home, {"id": "commits", "slot": "below-composer", "source": "git.commits", "program": COMMITS})
    finally:
        stop.set()
    assert out == {"ok": True, "mounted": "commits", "slot": "below-composer", "checked": True}
    data = json.loads(ui.settings_file(home).read_text())
    assert data["theme"] == "auto" and data["ui"]["widgets"][0]["program"] == COMMITS


def test_a_rejected_mount_is_removed_and_the_previous_one_restored(tmp_path):
    home = _home(tmp_path)
    first = {"id": "commits", "slot": "below-composer", "source": "git.commits", "program": COMMITS}
    assert ui.mount(home, first, wait=0)["checked"] is False
    stop = _pane(home, lambda ids: {"widgets": {i: {"ok": False, "problems": ["Unknown slot: nope."]} for i in ids}})
    try:
        out = ui.mount(home, {**first, "program": 'root = GlideCard("commits", [Hero("nope")])'})
    finally:
        stop.set()
    assert out == {"ok": False, "mounted": None, "problems": ["Unknown slot: nope."]}
    assert ui.state(home)["widgets"] == [first]


def test_mount_validates_before_writing(tmp_path):
    home = _home(tmp_path)
    base = {"id": "focus", "slot": "composer-ring", "source": "clock.focus", "program": "root = x"}
    assert "slot" in ui.mount(home, {**base, "slot": "sidebar"})["error"]
    assert "source" in ui.mount(home, {**base, "source": "shell"})["error"]
    assert "id" in ui.mount(home, {**base, "id": "Bad Id"})["error"]
    assert "minutes" in ui.mount(home, {**base, "minutes": 0})["error"]
    assert not ui.settings_file(home).exists()
    out = ui.mount(home, {**base, "minutes": 50}, wait=0, now=1000.0)
    assert out["ok"] and ui.state(home)["widgets"][0] | {} == {**base, "minutes": 50, "startedAt": 1_000_000}


def test_style_unmount_list_and_reset(tmp_path, monkeypatch):
    home = _home(tmp_path)
    monkeypatch.setattr(ui, "_home", lambda: home)
    monkeypatch.setattr(plugin.core, "_home", lambda: home)
    ui.mount(home, {"id": "commits", "slot": "below-composer", "source": "git.commits", "program": COMMITS}, wait=0)
    assert ui.style(home, {"warmth": 0.6}, wait=0)["style"] == {"warmth": 0.6}
    assert ui.style(home, {"accent": "#FFAA00"}, wait=0)["style"] == {"warmth": 0.6, "accent": "#ffaa00"}
    assert "error" in ui.style(home, {"warmth": 3}, wait=0)
    listed = ui.command("list")
    assert "commits: git.commits in below-composer" in listed and '"warmth": 0.6' in listed
    assert ui.unmount(home, {"id": "nope"})["ok"] is False
    assert ui.unmount(home, {"id": "commits"}) == {"ok": True, "mounted": []}
    assert ui.command("reset").startswith("Glide UI reset")
    assert "ui" not in json.loads(ui.settings_file(home).read_text())
    assert plugin.core.command("ui") == "No widgets mounted."


def test_register_adds_the_three_tools():
    tools = {}
    ctx = types.SimpleNamespace(register_hook=lambda *a: None, register_command=lambda *a, **k: None,
                                register_tool=lambda **kw: tools.__setitem__(kw["name"], kw))
    plugin.register(ctx)
    assert sorted(tools) == ["glide_ui_mount", "glide_ui_style", "glide_ui_unmount"]
    assert all(t["toolset"] == "glide" and t["schema"]["name"] == n for n, t in tools.items())

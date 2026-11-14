"""glide_skin: a chat ask becomes the active skin file, and each re-call is a live repaint."""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

pytest.importorskip("hermes_cli.skin_engine")

from hermes_tern_plugin.live_skin import glide_skin  # noqa: E402


def _call(**args):
    return json.loads(glide_skin(args))


def _home() -> Path:
    return Path(os.environ["HERMES_HOME"])


def _active() -> str:
    import yaml

    return yaml.safe_load((_home() / "config.yaml").read_text())["display"]["skin"]


def test_a_chat_skin_is_written_activated_and_reaches_the_gateway_watcher():
    from tui_gateway import server

    made = _call(name="pixel-quest", colors={"background": "#120a24", "ui_accent": "#ff5fd2"},
                 customCSS="body { animation: drift 8s infinite; }")
    first = server._skin_sig()
    os.utime(_home() / "skins" / "pixel-quest.yaml", (first[1] - 10, first[1] - 10))
    first = server._skin_sig()
    tweaked = _call(name="pixel-quest", customCSS="body { animation: drift 4s infinite; }")

    from hermes_cli.skin_engine import load_skin

    assert made["success"] and tweaked["success"] and _active() == "pixel-quest"
    assert first[0] == "pixel-quest" and server._skin_sig() != first  # the watcher re-broadcasts skin.changed
    skin = load_skin("pixel-quest")
    assert skin.custom_css == "body { animation: drift 4s infinite; }"


def test_name_only_switches_to_an_existing_or_builtin_skin():
    result = _call(name="default")

    assert result["success"] and result["skin"] == "default" and _active() == "default"


@pytest.mark.parametrize("args, error", [
    ({"name": "Bad Name", "customCSS": "a{}"}, "lowercase"),
    ({"name": "nope"}, "No skin"),
    ({"name": "default", "customCSS": "a{}"}, "built-in"),
    ({"name": "x", "colors": {"background": "red"}}, "hex"),
    ({"name": "x", "customCSS": "a" * 32_769}, "32768"),
])
def test_bad_asks_write_nothing(args, error):
    result = _call(**args)

    assert result["success"] is False and error in result["error"]
    assert not (_home() / "config.yaml").exists() and not (_home() / "skins").exists()

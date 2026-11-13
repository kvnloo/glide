"""Agent-mounted Glide widgets (kvnloo/glide#326): glide_ui_mount, glide_ui_unmount, glide_ui_style.

A widget is a glide/v1 OpenUI program that only picks a data source's slots, a dock slot around the
composer, and that source; the Glide pane binds the source's live data itself. State is the ``ui`` key
of ``<home>/glide/settings.json`` (the frontend's own settings file). Each open pane compiles the program
with the real lang-core adapter, runs the design checks and writes ``ui-status.json``; a tool waits for
that verdict and removes a mount that failed it, so a bad program never stays mounted.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import time
from pathlib import Path
from typing import Any

SLOTS = ("above-composer", "below-composer", "composer-ring", "sidebar")
SOURCES = {
    "git.commits": "The session repository's git log: heat (Graphic, a 52-week heatmap), total (Hero), "
                   "stats (Stats: this week, streak, best day), trend (Spark, weekly), repo (Text). Card key \"commits\".",
    "clock.focus": "A focus block timer that ticks every second: left (Hero, time left), meter (Meter, fill left), "
                   "state (Badges), ring (Graphic, a progress ring). Card key \"focus\". Pass minutes.",
}
TOOLSET = "glide"
_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,39}$")
WAIT_S = 6.0

_PROGRAM_HELP = (
    "A glide/v1 OpenUI program: `root = GlideCard(\"<card key>\", [parts])`, each part naming one of the "
    "source's slot keys, e.g. `root = GlideCard(\"commits\", [Graphic(\"heat\"), Stats(\"stats\")])`. "
    "Row([..]) puts parts side by side. Programs carry no data, colors or styles."
)

MOUNT_SCHEMA = {
    "name": "glide_ui_mount",
    "description": (
        "Mount a persistent widget around the Glide composer that updates itself from host data and "
        "survives relaunches. slot: above-composer, below-composer, composer-ring (anything that runs "
        "\"around\" or \"on\" the composer, like a focus timer: a strip on the composer's edge; Meter, Hero, "
        "Text, Badges or Graphic only, at most 3 parts), or sidebar (docked at "
        "the pane's right edge while no other aside is open). Sources: "
        + " ".join(f"{k}: {v}" for k, v in SOURCES.items()) + " " + _PROGRAM_HELP
        + " For a full-pane app beside the chat, write the file and run `tern open --split right PATH` in the "
        "terminal instead (it lands beside this pane). Mounting the same id again replaces it. The open Glide pane checks the program and the design "
        "rules (text >= 11 px, no glow or motion, contrast) and the result says whether it mounted."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "id": {"type": "string", "description": "Short lowercase id, e.g. commits or focus."},
            "slot": {"type": "string", "enum": list(SLOTS)},
            "source": {"type": "string", "enum": list(SOURCES)},
            "program": {"type": "string", "description": _PROGRAM_HELP},
            "minutes": {"type": "integer", "minimum": 1, "maximum": 240, "description": "clock.focus only: the block length."},
        },
        "required": ["id", "slot", "source", "program"],
        "additionalProperties": False,
    },
}
UNMOUNT_SCHEMA = {
    "name": "glide_ui_unmount",
    "description": "Remove a widget mounted with glide_ui_mount, by id; id \"*\" removes every widget.",
    "parameters": {"type": "object", "properties": {"id": {"type": "string"}}, "required": ["id"], "additionalProperties": False},
}
STYLE_SCHEMA = {
    "name": "glide_ui_style",
    "description": (
        "Restyle the whole Glide surface (chat, cards and every mounted widget) through its palette tokens. "
        "warmth: -1 (cool) to 1 (warm), 0 is the wallpaper's own colors; accent: one #rrggbb accent. "
        "Text stays at 4.5:1 contrast. reset: true goes back to the wallpaper's palette. "
        "Example: \"make it warmer\" -> warmth 0.6."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "warmth": {"type": "number", "minimum": -1, "maximum": 1},
            "accent": {"type": "string", "pattern": "^#[0-9a-fA-F]{6}$"},
            "reset": {"type": "boolean"},
        },
        "additionalProperties": False,
    },
}


def _home() -> Path:
    from hermes_constants import get_hermes_home

    return Path(get_hermes_home())


def settings_file(home: Path) -> Path:
    return home / "glide" / "settings.json"


def status_file(home: Path) -> Path:
    return home / "glide" / "ui-status.json"


def _read(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text())
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _write_ui(home: Path, ui: dict[str, Any] | None) -> int:
    """Replaces settings.json's ``ui`` (None removes it), keeping every other key; returns the new rev."""
    path = settings_file(home)
    data = _read(path)
    rev = 0
    if ui is None:
        data.pop("ui", None)
    else:
        rev = int((data.get("ui") or {}).get("rev") or 0) + 1
        data["ui"] = {**ui, "rev": rev}
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".settings.")
    with os.fdopen(fd, "w") as f:
        f.write(json.dumps(data, indent=2) + "\n")
    os.replace(tmp, path)
    return rev


def state(home: Path) -> dict[str, Any]:
    ui = _read(settings_file(home)).get("ui")
    ui = ui if isinstance(ui, dict) else {}
    widgets = [w for w in ui.get("widgets") or [] if isinstance(w, dict)]
    return {"widgets": widgets, **({"style": ui["style"]} if isinstance(ui.get("style"), dict) else {})}


def _verdict(home: Path, rev: int, wait: float) -> dict[str, Any] | None:
    """The open pane's ui-status.json for ``rev``; None when no pane answered within ``wait``."""
    end = time.monotonic() + wait
    while True:
        status = _read(status_file(home))
        if isinstance(status.get("rev"), int) and status["rev"] >= rev:
            return status
        if time.monotonic() >= end:
            return None
        time.sleep(0.1)


def mount(home: Path, args: dict[str, Any], *, wait: float = WAIT_S, now: float | None = None) -> dict[str, Any]:
    wid, slot, source, program = (args.get(k) for k in ("id", "slot", "source", "program"))
    if not isinstance(wid, str) or not _ID.match(wid):
        return {"ok": False, "error": "id: use 1-40 lowercase letters, digits or dashes"}
    if slot not in SLOTS:
        return {"ok": False, "error": f"slot: one of {', '.join(SLOTS)}"}
    if source not in SOURCES:
        return {"ok": False, "error": f"source: one of {', '.join(SOURCES)}"}
    if not isinstance(program, str) or not program.strip() or len(program.encode()) > 4096:
        return {"ok": False, "error": "program: a glide/v1 program of at most 4 KiB"}
    widget: dict[str, Any] = {"id": wid, "slot": slot, "source": source, "program": program}
    if source == "clock.focus":
        minutes = args.get("minutes", 25)
        if not isinstance(minutes, int) or not 1 <= minutes <= 240:
            return {"ok": False, "error": "minutes: 1 to 240"}
        widget |= {"minutes": minutes, "startedAt": int((now if now is not None else time.time()) * 1000)}
    current = state(home)
    previous = next((w for w in current["widgets"] if w.get("id") == wid), None)
    widgets = [w for w in current["widgets"] if w.get("id") != wid] + [widget]
    rev = _write_ui(home, {**current, "widgets": widgets})
    verdict = _verdict(home, rev, wait)
    if verdict is None:
        return {"ok": True, "mounted": wid, "checked": False,
                "note": "Saved. No Glide pane answered, so the program is checked when one opens."}
    result = (verdict.get("widgets") or {}).get(wid) or {"ok": False, "problems": ["the pane did not report this widget"]}
    if result.get("ok"):
        return {"ok": True, "mounted": wid, "slot": slot, "checked": True}
    # Fail closed: a widget that does not compile or check is taken back out (the previous one restored).
    after = [w for w in state(home)["widgets"] if w.get("id") != wid] + ([previous] if previous else [])
    _write_ui(home, {**state(home), "widgets": after})
    return {"ok": False, "mounted": None, "problems": result.get("problems", [])}


def unmount(home: Path, args: dict[str, Any]) -> dict[str, Any]:
    wid = args.get("id")
    current = state(home)
    keep = [] if wid == "*" else [w for w in current["widgets"] if w.get("id") != wid]
    if len(keep) == len(current["widgets"]):
        return {"ok": False, "error": f"No widget {wid!r}", "mounted": [w.get("id") for w in keep]}
    _write_ui(home, {**current, "widgets": keep})
    return {"ok": True, "mounted": [w.get("id") for w in keep]}


def style(home: Path, args: dict[str, Any], *, wait: float = WAIT_S) -> dict[str, Any]:
    current = state(home)
    if args.get("reset"):
        current.pop("style", None)
        rev = _write_ui(home, current)
        return {"ok": True, "style": None, "checked": _verdict(home, rev, wait) is not None}
    patch: dict[str, Any] = dict(current.get("style") or {})
    if "warmth" in args:
        w = args["warmth"]
        if not isinstance(w, (int, float)) or not -1 <= w <= 1:
            return {"ok": False, "error": "warmth: -1 to 1"}
        patch["warmth"] = float(w)
    if "accent" in args:
        a = args["accent"]
        if not isinstance(a, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", a):
            return {"ok": False, "error": "accent: #rrggbb"}
        patch["accent"] = a.lower()
    if not patch:
        return {"ok": False, "error": "Pass warmth, accent or reset."}
    rev = _write_ui(home, {**current, "style": patch})
    verdict = _verdict(home, rev, wait)
    if verdict is None:
        return {"ok": True, "style": patch, "checked": False, "note": "Saved. No Glide pane answered."}
    checked = verdict.get("style") or {}
    return {"ok": bool(checked.get("ok", True)), "style": patch, "checked": True,
            **({"problems": checked["problems"]} if checked.get("problems") else {})}


def reset(home: Path) -> str:
    """`/glide ui reset`: every widget and the style removed."""
    _write_ui(home, None)
    return "Glide UI reset: no widgets, the wallpaper's own palette."


def command(rest: str) -> str:
    """`/glide ui [list|reset]`."""
    home = _home()
    verb = rest.strip().lower()
    if verb == "reset":
        return reset(home)
    if verb in ("", "list"):
        s = state(home)
        rows = [f"- {w.get('id')}: {w.get('source')} in {w.get('slot')}" for w in s["widgets"]]
        return "\n".join(rows + ([f"Style: {json.dumps(s['style'])}"] if s.get("style") else [])) or "No widgets mounted."
    return "Usage: /glide ui [list|reset]"


def _tool(fn):
    def handler(args: dict[str, Any], **_: Any) -> str:
        from tools.registry import tool_result

        return tool_result(fn(_home(), args or {}))

    return handler


PROMPT = """<glide_ui>
The Glide pane's look is yours to change. A widget around the composer (above or below it, on its edge,
in the sidebar) is glide_ui_mount; removing one is glide_ui_unmount; a restyle ("make it warmer", cooler,
an accent color) is glide_ui_style and means the UI palette, never the model's temperature. If these tools
are not loaded, find them with tool_search ("glide ui").
</glide_ui>"""


def register(ctx) -> None:
    if callable(getattr(ctx, "register_system_prompt_section", None)):
        ctx.register_system_prompt_section("glide.ui", PROMPT)
    for schema, fn in ((MOUNT_SCHEMA, mount), (UNMOUNT_SCHEMA, unmount), (STYLE_SCHEMA, style)):
        ctx.register_tool(name=schema["name"], toolset=TOOLSET, schema=schema, handler=_tool(fn),
                          description=schema["description"], emoji="🧩")

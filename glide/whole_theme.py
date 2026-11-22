"""``glide_theme``: the agent switches the whole Glide surface to one named theme, or flips it day and night.

The themes are data: ``frontend/themes.json`` holds one token set per theme, read here and by the frontend
(``frontend/themes.ts``). A switch writes settings.json's ``theme`` (the same key the ``/theme`` picker keeps)
and bumps ``ui.rev`` in one write; each open pane follows the file, wears the theme, checks its contrast and
answers in ui-status.json, which the tool waits on like glide_ui_style does. Each theme names its ``pair`` for
the other ``phase``, so "night" from sepia is warm-dark. ``omp_themes`` gives Tern a window theme per entry
(``glide-<name>``), built from Dash's token map, so the stage around the chat repaints too.
"""

from __future__ import annotations

import json
from functools import cache
from pathlib import Path
from typing import Any

from . import ui

TABLE = Path(__file__).resolve().parent / "frontend" / "themes.json"
DASH = Path(__file__).resolve().parent / "themes" / "dash.json"
TOOLSET = "glide"
# The modes the frontend had before the table (settings.ts ThemeMode); the tool can go back to any of them.
BUILTIN = ("tern", "nous", "skin", "auto", "dash")
PHASES = ("day", "night")


@cache
def table() -> dict[str, dict[str, str]]:
    return json.loads(TABLE.read_text())["themes"]


def modes() -> tuple[str, ...]:
    return (*table(), *BUILTIN)


SCHEMA = {
    "name": "glide_theme",
    "description": (
        "Switch the WHOLE Glide look (chat, cards, widgets, pages and the Tern window round them) to one named "
        "theme: " + ", ".join(f"{n} ({t['detail'].lower()})" for n, t in table().items())
        + "; or back to tern (the user's Tern theme), nous, dash, auto (wallpaper) or skin. phase day or night "
        "wears the theme's pair for that time of day (sepia at night is warm-dark, light at night is dark-code), "
        "flip swaps it. glide_ui_style only tints the current palette (warmth, accent); this replaces every "
        "token. Examples: \"make it sepia\" -> theme sepia; \"night mode\" -> phase night; \"same in dark\" -> "
        "phase night. Pages get the phase in their glide-theme event, so a game can draw its sky."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "theme": {"type": "string", "enum": list(modes())},
            "phase": {"type": "string", "enum": [*PHASES, "flip"]},
        },
        "additionalProperties": False,
    },
}


def resolve(current: str, theme: str | None, phase: str | None) -> str:
    """The mode to wear: ``theme`` (else ``current``) moved to ``phase`` through its pair. Outside the table
    there is no pair, so a phase there lands on the day/night themes (flip from Dash's night is day)."""
    base = theme or current
    if phase is None:
        return base
    entry = table().get(base)
    if entry is None:
        if phase == "flip":
            return "day" if base == "dash" else "night"
        return phase
    if phase == "flip" or entry["phase"] != phase:
        return entry["pair"]
    return base


def current(home: Path) -> str:
    mode = ui._read(ui.settings_file(home)).get("theme")
    return mode if mode in modes() else "tern"


def switch(home: Path, args: dict[str, Any], *, wait: float = ui.WAIT_S) -> dict[str, Any]:
    theme, phase = args.get("theme"), args.get("phase")
    if theme is not None and theme not in modes():
        return {"ok": False, "error": f"theme: one of {', '.join(modes())}"}
    if phase is not None and phase not in (*PHASES, "flip"):
        return {"ok": False, "error": "phase: day, night or flip"}
    if theme is None and phase is None:
        return {"ok": False, "error": "Pass theme, phase or both."}
    mode = resolve(current(home), theme, phase)
    entry = table().get(mode)
    out: dict[str, Any] = {"theme": mode, **({"phase": entry["phase"], "pair": entry["pair"]} if entry else {})}
    rev = ui._write_ui(home, ui.state(home), theme=mode)
    verdict = ui._verdict(home, rev, wait)
    if verdict is None:
        return {"ok": True, **out, "checked": False, "note": "Saved. No Glide pane answered; the next one wears it."}
    worn = verdict.get("theme")
    if not isinstance(worn, dict):
        return {"ok": True, **out, "checked": False, "note": "The open pane predates whole themes; a relaunch wears it."}
    if worn.get("mode") != mode:
        return {"ok": False, **out, "checked": True, "problems": [f"the pane wears {worn.get('mode')!r}"]}
    problems = worn.get("problems") or []
    return {"ok": not problems, **out, "checked": True, **({"problems": problems} if problems else {})}


def _mix(a: str, b: str, k: float) -> str:
    return "#" + "".join(f"{round(int(a[i:i + 2], 16) * (1 - k) + int(b[i:i + 2], 16) * k):02x}" for i in (1, 3, 5))


def omp_theme(name: str) -> dict[str, Any]:
    """Tern's window theme for table entry ``name``: Dash's token map over this theme's colors."""
    t = table()[name]
    bg, fg, accent = t["bg"], t["fg"], t["accent"]
    template = json.loads(DASH.read_text())
    vars_ = {
        "background": bg, "foreground": fg, "card": _mix(bg, fg, 0.03), "muted": _mix(bg, fg, 0.06),
        "mutedForeground": t["muted"], "popover": _mix(bg, fg, 0.08), "primary": accent,
        "secondary": _mix(bg, accent, 0.15), "accent": _mix(bg, accent, 0.14), "border": _mix(bg, fg, 0.22),
        "destructive": t["error"], "userBubble": _mix(bg, fg, 0.05), "faint": t["dim"], "red": t["error"],
        "green": t["success"], "yellow": t["warning"], "blue": t["info"], "magenta": t["magenta"], "cyan": t["cyan"],
        "brightBlue": _mix(t["info"], fg, 0.3), "brightMagenta": _mix(t["magenta"], fg, 0.3),
    }
    assert set(vars_) == set(template["vars"]), "Dash's token map changed: map the new vars here too"
    return {**template, "name": f"glide-{name}", "vars": vars_}


def omp_themes() -> dict[str, bytes]:
    """File name -> body for every table theme, as launcher.install_themes writes them."""
    return {f"glide-{n}.json": (json.dumps(omp_theme(n), indent="\t") + "\n").encode() for n in table()}


def register(ctx) -> None:
    def handler(args: dict[str, Any], **_: Any) -> str:
        from tools.registry import tool_result

        return tool_result(switch(ui._home(), args or {}))

    ctx.register_tool(name="glide_theme", toolset=TOOLSET, schema=SCHEMA, handler=handler,
                      description=SCHEMA["description"], emoji="🌗")

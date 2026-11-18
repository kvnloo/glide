"""``glide_skin``: the agent restyles Hermes from chat, and every open surface repaints live.

The tool writes ``$HERMES_HOME/skins/<name>.yaml`` (colors plus raw ``customCSS``) and makes it
``display.skin``. Hermes' gateway watcher already broadcasts ``skin.changed`` when that key moves or
the active skin file's mtime does, so Hermes Desktop injects the new CSS and Glide's ``skin`` theme
mode re-palettes without a restart. Calling the tool again with the same name is the edit loop.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

TOOLSET = "glide"
NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$")
CSS_LIMIT = 32_768  # hermes_cli/skin_engine.py truncates customCSS here

SCHEMA = {
    "name": "glide_skin",
    "description": (
        "Restyle Hermes live: write a skin (palette + raw CSS) and make it active. Hermes Desktop and "
        "Glide (theme mode `skin`) repaint at once. Call again with the same name to tweak it after the "
        "user's feedback; each call replaces the skin file. customCSS can use @keyframes, gradients and "
        "SVG data: URIs for illustrated or animated backgrounds. Pass only name to switch to an "
        "existing skin (built-ins included)."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "Skin id: lowercase letters, digits, - and _."},
            "description": {"type": "string"},
            "colors": {
                "type": "object",
                "additionalProperties": {"type": "string"},
                "description": ("Hex colours by skin key: background, ui_text, ui_accent, ui_border, ui_error, "
                                "banner_title, status_bar_bg, ... Missing keys inherit the default skin."),
            },
            "customCSS": {"type": "string", "description": "Raw CSS for the GUI surfaces, up to 32 KiB."},
        },
        "required": ["name"],
    },
}


def _fail(error: str, **extra) -> str:
    return json.dumps({"success": False, "error": error, **extra}, ensure_ascii=False)


def glide_skin(args: dict, **_kw) -> str:
    from hermes_cli.config_backend import write_config_key
    from hermes_cli.skin_engine import _BUILTIN_SKINS, list_skins
    from hermes_constants import get_hermes_home

    name = str(args.get("name") or "").strip()
    colors, css = args.get("colors"), args.get("customCSS")
    if not NAME_RE.match(name):
        return _fail("name must be lowercase letters, digits, - or _ (max 64).")
    home = Path(get_hermes_home())
    path = home / "skins" / f"{name}.yaml"
    if colors is None and css is None:
        if name not in _BUILTIN_SKINS and not path.is_file():
            return _fail(f"No skin {name!r}; pass colors and/or customCSS to create it.",
                         available=[s["name"] for s in list_skins()])
    else:
        if name in _BUILTIN_SKINS:
            return _fail(f"{name!r} is a built-in skin; pick a new name for a custom one.")
        if colors is not None and (not isinstance(colors, dict) or not all(
                isinstance(k, str) and isinstance(v, str) and HEX_RE.match(v.strip()) for k, v in colors.items())):
            return _fail("colors maps skin keys to hex colours like #1a1030.")
        if css is not None and (not isinstance(css, str) or len(css.encode()) > CSS_LIMIT):
            return _fail(f"customCSS must be a string of at most {CSS_LIMIT} bytes.")
        import yaml

        body: dict[str, object] = {"name": name, "description": str(args.get("description") or "Made in chat")}
        if colors:
            body["colors"] = {k: v.strip() for k, v in colors.items()}
        if css:
            body["customCSS"] = css.strip()
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".yaml.tmp")
        tmp.write_text(yaml.safe_dump(body, sort_keys=False, allow_unicode=True), encoding="utf-8")
        tmp.replace(path)  # one mtime move: the watcher never reads a half-written skin
    write_config_key(home / "config.yaml", "display.skin", name)
    return json.dumps({"success": True, "skin": name, **({"file": str(path)} if path.is_file() else {}),
                       "note": "Hermes Desktop repaints now; Glide wears it in theme mode `skin` (/theme skin)."},
                      ensure_ascii=False)


def register(ctx) -> None:
    ctx.register_tool(name="glide_skin", toolset=TOOLSET, schema=SCHEMA, handler=glide_skin, emoji="🎨",
                      description=SCHEMA["description"])

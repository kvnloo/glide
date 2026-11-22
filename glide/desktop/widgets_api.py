"""Project a safe subset of existing Glide widget mounts to Desktop."""

import re

from fastapi import APIRouter

from .. import ui

router = APIRouter()

_ID = re.compile(r"[a-z0-9][a-z0-9-]{0,39}")
_PART = re.compile(r'(Hero\("left"\)|Meter\("meter"\)|Badges\("state"\))')
_PROGRAM = re.compile(
    r'\s*root\s*=\s*GlideCard\s*\(\s*"focus"\s*,\s*\[([^\[\]]{1,160})\]\s*\)\s*'
)
_SLOTS = ("above-composer", "composer-ring")
_MAX_MINUTES = 240
_MS_PER_MINUTE = 60_000
_MAX_START_MS = 2**53 - _MAX_MINUTES * _MS_PER_MINUTE
_MAX_PROGRAM_LENGTH = 4096


def project(widget: dict) -> dict | None:
    wid, slot, minutes, started, program = (
        widget.get(key) for key in ("id", "slot", "minutes", "startedAt", "program")
    )
    if (widget.get("source") != "clock.focus" or not isinstance(slot, str) or slot not in _SLOTS
            or not isinstance(wid, str) or not _ID.fullmatch(wid)
            or type(minutes) is not int or not 1 <= minutes <= _MAX_MINUTES
            or type(started) is not int or not 0 < started < _MAX_START_MS
            or not isinstance(program, str) or len(program) > _MAX_PROGRAM_LENGTH):
        return None
    match = _PROGRAM.fullmatch(program)
    if not match:
        return None
    parts = [part.strip() for part in match[1].split(",")]
    if not 1 <= len(parts) <= 3 or len(set(parts)) != len(parts) or not all(map(_PART.fullmatch, parts)):
        return None
    if slot == "composer-ring" and 'Meter("meter")' not in parts:
        return None
    duration = minutes * _MS_PER_MINUTE
    return {"id": wid, "end": started + duration, "duration": duration,
            "parts": [part.split("(")[0] for part in parts]}


@router.get("/widgets")
def widgets() -> dict:
    return {"widgets": [item for mount in ui.state(ui._home())["widgets"] if (item := project(mount))]}

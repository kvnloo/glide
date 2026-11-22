"""Profile-wide Desktop controls. Hermes supplies the authenticated profile scope."""

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .. import attention, core, source
from ..memory import MemoryNotReady

router = APIRouter()
_DEFAULT_BLOCK_MINUTES = 50
_MAX_BLOCK_MINUTES = 240


class Action(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: Literal["sync", "enable", "disable", "recall", "start", "stop"]
    query: str = Field(default="", max_length=512)
    minutes: int = Field(default=_DEFAULT_BLOCK_MINUTES, strict=True, ge=5, le=_MAX_BLOCK_MINUTES)


@router.get("/features")
def features() -> dict:
    home = core._home()
    return {"memory": core.status(home), "focus": attention.focus(home)}


@router.post("/features")
def update(command: Action) -> dict:
    home = core._home()
    result = {}
    match command.action:
        case "sync":
            result["scanned"] = core.sync(home, source.MAX_SESSIONS)["scanned"]
        case "enable" | "disable":
            core.set_enabled(home, command.action == "enable")
        case "recall":
            if not command.query.strip():
                raise HTTPException(422, "Enter a recall query.")
            try:
                result["hits"] = [hit["text"] for hit in core.recall(home, command.query.strip())]
            except MemoryNotReady:
                raise HTTPException(409, "Build the corrections index before searching.") from None
        case "start":
            attention.start_block(home, command.minutes)
        case "stop":
            result["digest"] = attention.stop_block(home)["digest"]
    return {**features(), **result}

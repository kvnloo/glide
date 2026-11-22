"""Profile-wide Desktop controls. Hermes supplies the authenticated profile scope."""

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .. import attention, core, source
from ..memory import MemoryNotReady

router = APIRouter()


class Action(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: Literal["sync", "enable", "disable", "recall", "start", "stop"]
    query: str = Field(default="", max_length=512)
    minutes: int = Field(default=50, strict=True, ge=5, le=240)


@router.get("/features")
def features() -> dict:
    home = core._home()
    return {"memory": core.status(home), "focus": attention.focus(home)}


@router.post("/features")
def update(command: Action) -> dict:
    home = core._home()
    result = {}
    if command.action == "sync":
        result["scanned"] = core.sync(home, source.MAX_SESSIONS)["scanned"]
    elif command.action in {"enable", "disable"}:
        core.set_enabled(home, command.action == "enable")
    elif command.action == "recall":
        if not command.query.strip():
            raise HTTPException(422, "Enter a recall query.")
        try:
            result["hits"] = [hit["text"] for hit in core.recall(home, command.query.strip())]
        except MemoryNotReady:
            raise HTTPException(409, "Build the corrections index before searching.") from None
    elif command.action == "start":
        attention.start_block(home, command.minutes)
    elif command.action == "stop":
        result["digest"] = attention.stop_block(home)["digest"]
    return {**features(), **result}

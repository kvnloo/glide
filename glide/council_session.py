"""Council sessions: a council started on one client and continued on another (GL-103).

A council session is one recorded ``glide.council-run/v1`` snapshot, the passages its readers speak,
and where the reading is (``position``). It is stored in the profile at
``<HERMES_HOME>/glide/councils/<council_id>.json`` and tied to the Hermes conversation it was started
in (``stored_session_id``, the root of the session tree), so a phone that resumes that conversation
finds the council and keeps listening. The wire shape is ``glide/docs/council-session.md``.

The run is stored as the starter sent it: clients validate it with their own strict run parsers.
The store checks the envelope, sizes and ids, and serializes position writes: a write names the
revision it was based on, and a stale one is refused so a device that was handed off stops writing.
"""

from __future__ import annotations

import contextlib
import fcntl
import json
import os
import secrets
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt

SCHEMA = "glide.council-session/v1"
RUN_SCHEMA = "glide.council-run/v1"
NAMESPACE = "glide.council"
MAX_RUN_BYTES = 64 * 1024
MAX_COUNCILS = 64
CONFLICT = 4090
NOT_FOUND = 4004
INVALID = 4000
_ID = r"^council-[0-9a-f]{32}$"
_CLIENT = r"^[a-z0-9][a-z0-9._-]{0,31}$"
_SEAT = r"^[a-z0-9][a-z0-9._-]{0,39}$"
_PASSAGE = r"^(brief|verdict|report:[a-z0-9-]{1,24}|seat:[a-z0-9][a-z0-9._-]{0,39})$"


class Conflict(Exception):
    """A position write based on a revision that is no longer current."""

    def __init__(self, revision: int):
        super().__init__(f"the council moved on: revision {revision} is current")
        self.revision = revision


class Passage(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    key: str = Field(pattern=_PASSAGE)
    label: str = Field(min_length=1, max_length=40)
    text: str = Field(min_length=1, max_length=4000)
    seat: str | None = Field(default=None, pattern=_SEAT)


class Position(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    elapsed_ms: StrictInt = Field(default=0, ge=0, le=24 * 3600 * 1000)
    passage: str | None = Field(default=None, pattern=_PASSAGE)
    sentence: StrictInt = Field(default=0, ge=0, le=999)
    read_aloud: StrictBool = False
    muted: StrictBool = False


class SessionParams(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    session_id: str = Field(min_length=1)


class StartParams(SessionParams):
    stored_session_id: str | None = Field(default=None, min_length=1, max_length=200)
    client: str = Field(pattern=_CLIENT)
    live: StrictBool
    from_: str = Field(alias="from", min_length=1, max_length=200)
    run: dict
    passages: list[Passage] = Field(min_length=1, max_length=16)
    position: Position = Field(default_factory=Position)


class LoadParams(SessionParams):
    council_id: str = Field(pattern=_ID)


class ListParams(SessionParams):
    stored_session_id: str | None = Field(default=None, min_length=1, max_length=200)
    limit: StrictInt = Field(default=20, ge=1, le=MAX_COUNCILS)


class PositionParams(LoadParams):
    client: str = Field(pattern=_CLIENT)
    base_revision: StrictInt = Field(ge=1)
    position: Position


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _dir(home: Path) -> Path:
    path = home / "glide" / "councils"
    path.mkdir(parents=True, exist_ok=True)
    return path


@contextlib.contextmanager
def _locked(home: Path):
    """One writer at a time across the panes and devices this profile serves."""
    with open(_dir(home) / ".lock", "a+") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def _write(home: Path, state: dict) -> None:
    folder = _dir(home)
    fd, tmp = tempfile.mkstemp(dir=folder, prefix=".council-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            json.dump(state, out, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, folder / f"{state['council_id']}.json")
    except BaseException:
        with contextlib.suppress(OSError):
            os.unlink(tmp)
        raise


def _read(home: Path, council_id: str) -> dict:
    try:
        state = json.loads((_dir(home) / f"{council_id}.json").read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise LookupError(f"no council {council_id}") from None
    if not isinstance(state, dict) or state.get("schema") != SCHEMA:
        raise LookupError(f"council {council_id} is not a {SCHEMA} record")
    return state


def _check_run(run: dict, passages: list[Passage]) -> None:
    if run.get("schema") != RUN_SCHEMA:
        raise ValueError(f"run: expected schema {RUN_SCHEMA!r}")
    if len(json.dumps(run, ensure_ascii=False).encode("utf-8")) > MAX_RUN_BYTES:
        raise ValueError(f"run: larger than {MAX_RUN_BYTES} bytes")
    if not isinstance(run.get("brief"), str) or not run["brief"].strip():
        raise ValueError("run: expected a brief")
    seats = {s.get("id") for s in run.get("seats") or [] if isinstance(s, dict)}
    keys = [p.key for p in passages]
    if len(set(keys)) != len(keys):
        raise ValueError("passages: two passages share a key")
    if keys[0] != "brief":
        raise ValueError("passages: the first passage is the brief")
    for p in passages:
        if p.seat is not None and p.seat not in seats:
            raise ValueError(f"passages: {p.key} names an unknown seat")


def _check_position(position: Position, state: dict) -> None:
    if position.passage is not None and position.passage not in {p["key"] for p in state["passages"]}:
        raise ValueError(f"position: unknown passage {position.passage!r}")


def _prune(home: Path, keep: str) -> None:
    """Keep the newest MAX_COUNCILS records, always including the one just written."""
    files = sorted((p for p in _dir(home).glob("council-*.json") if p.stem != keep),
                   key=lambda p: p.stat().st_mtime_ns, reverse=True)
    for old in files[MAX_COUNCILS - 1:]:
        with contextlib.suppress(OSError):
            old.unlink()


def start(home: Path, params: StartParams) -> dict:
    _check_run(params.run, params.passages)
    now = _now()
    state = {
        "schema": SCHEMA,
        "council_id": f"council-{secrets.token_hex(16)}",
        "stored_session_id": params.stored_session_id,
        "revision": 1,
        "created_at": now,
        "updated_at": now,
        "started_by": params.client,
        "updated_by": params.client,
        "live": params.live,
        "from": params.from_,
        "run": params.run,
        "passages": [p.model_dump() for p in params.passages],
        "position": params.position.model_dump(),
    }
    _check_position(params.position, state)
    with _locked(home):
        _write(home, state)
        _prune(home, state["council_id"])
    return state


def load(home: Path, params: LoadParams) -> dict:
    return _read(home, params.council_id)


def summaries(home: Path, params: ListParams) -> dict:
    """Newest first; only one Hermes conversation's councils when ``stored_session_id`` is given."""
    rows = []
    for path in _dir(home).glob("council-*.json"):
        with contextlib.suppress(LookupError, ValueError, OSError):
            state = _read(home, path.stem)
            if params.stored_session_id and state.get("stored_session_id") != params.stored_session_id:
                continue
            row = {k: state.get(k) for k in (
                "council_id", "stored_session_id", "revision", "created_at", "updated_at", "started_by", "updated_by", "live")}
            rows.append({**row, "brief": state["run"]["brief"]})
    rows.sort(key=lambda r: r["updated_at"] or "", reverse=True)
    return {"councils": rows[: params.limit]}


def move(home: Path, params: PositionParams) -> dict:
    with _locked(home):
        state = _read(home, params.council_id)
        if state["revision"] != params.base_revision:
            raise Conflict(state["revision"])
        _check_position(params.position, state)
        state.update(position=params.position.model_dump(), revision=state["revision"] + 1,
                     updated_at=_now(), updated_by=params.client)
        _write(home, state)
    return state


VERBS = {
    "start": (StartParams, start),
    "load": (LoadParams, load),
    "list": (ListParams, summaries),
    "position": (PositionParams, move),
}


def call(home: Path, verb: str, params: dict) -> dict:
    """One council verb with its schema checked; shared by the gateway method and `/glide json`."""
    schema, run = VERBS[verb]
    return run(home, schema.model_validate(params))


def failure(error: Exception) -> tuple[int, str]:
    """The JSON-RPC code and one-line message for a refused call."""
    code = CONFLICT if isinstance(error, Conflict) else NOT_FOUND if isinstance(error, LookupError) else INVALID
    return code, str(error).splitlines()[0]


def register(ctx) -> None:
    """``glide.council.start|load|list|position`` on cores with plugin gateway methods.

    Councils belong to the profile, as the conversations they hang off do: any session attached to
    this profile (Glide on the desktop, the phone) may load and continue them.
    """
    registrar = getattr(ctx, "register_gateway_method", None)
    if not callable(registrar):
        return
    from . import core

    def bind(verb: str):
        def handler(request, params: dict):
            request.assert_attached()
            if params["session_id"] != request.session_id:
                raise PermissionError("not the attached session")
            try:
                return call(core._home(), verb, params)
            except (Conflict, LookupError, ValueError) as error:
                from hermes_cli.plugin_gateway_methods import GatewayMethodFailure

                raise GatewayMethodFailure(*failure(error)) from None
        return handler

    for verb, (schema, _run) in VERBS.items():
        registrar(f"{NAMESPACE}.{verb}", bind(verb), schema=schema)

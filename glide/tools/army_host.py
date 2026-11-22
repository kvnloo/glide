#!/usr/bin/env python3
"""TesterArmy fixture host: the real plugin, registered and driven headless in a private profile.

The plugin directory loads the way Hermes loads it (a package whose ``register(ctx)`` runs once), on a
recording context instead of a live Hermes. Every registration lands in an inventory the journey runner
checks, and the registered handlers are called exactly as a frontend reaches them:

    army_host.py inventory                      # what register(ctx) wired up, as JSON
    army_host.py command NAME [ARG...]          # a text-plugin slash command (`/glide focus`)
    army_host.py gateway METHOD JSON_PARAMS     # a registered gateway method, attached to the session
    army_host.py cli NAME                       # a registered `hermes NAME` subcommand's parser
    army_host.py cli_run NAME [ARGV...]         # that subcommand run with ARGV, stdin closed, output captured
    army_host.py tool NAME JSON_ARGS            # a registered tool's handler, for the fixture session
    army_host.py hook NAME JSON_KWARGS          # every handler registered for a hook
    army_host.py serve                          # one JSON request per stdin line, one reply per stdout line

``HERMES_HOME`` must point at a disposable profile and ``GLIDE_ARMY_FIXTURE`` must be set: the host
refuses to run otherwise, so a journey never writes the owner's profile.
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import importlib.util
import inspect
import io
import json
import os
import sys
import tempfile
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = "hermes_plugins.glide_army"
SESSION = "army-s1"
TRACE_CHARS = 1500  # the tail of a traceback a reply carries
OUTPUT_CHARS = 4000  # the tail of captured stdout/stderr a reply carries


class FixtureRequest:
    """The attached caller a registered gateway method sees (the public seam's fields only)."""

    def __init__(self, session_id: str = SESSION, profile: str = "army") -> None:
        self.session_id = session_id
        self.profile = profile

    def assert_attached(self) -> None:
        """The fixture caller stays attached for the whole run."""

    def capture_scope(self):
        raise PermissionError("gateway scope capture is unavailable in the fixture host")


def _request():
    with contextlib.suppress(ImportError):
        from hermes_cli.plugin_gateway_methods import GatewayRequestContext

        return GatewayRequestContext(session_id=SESSION, profile="army", _attached=lambda: True)
    return FixtureRequest()


class FixtureCtx:
    """A plugin context that records each public registration under its name."""

    profile_name = "army"

    def __init__(self) -> None:
        self.cli: dict[str, dict] = {}
        self.commands: dict[str, dict] = {}
        self.gateway: dict[str, dict] = {}
        self.rpc: dict[str, object] = {}
        self.tools: dict[str, dict] = {}
        self.hooks: dict[str, list] = {}
        self.skills: list[str] = []
        self.aux: list[str] = []
        self.other: list[str] = []
        self.unload: list = []

    def has_capability(self, _capability) -> bool:
        """No optional host capability is granted to the fixture plugin."""
        return False

    def on_unload(self, fn) -> None:
        self.unload.append(fn)

    def register_cli_command(self, name, help="", setup_fn=None, handler_fn=None, description=""):
        self.cli[name] = {"help": help, "setup": setup_fn, "handler": handler_fn}

    def register_command(self, name, handler=None, description="", args_hint="", **_kw):
        self.commands[name] = {"handler": handler, "description": description, "args_hint": args_hint}

    def register_gateway_method(self, name, handler, schema=None, **_kw):
        self.gateway[name] = {"handler": handler, "schema": schema}

    def register_rpc(self, name, fn, *_a, **_kw):
        self.rpc[name] = fn

    def register_tool(self, name=None, *args, **kwargs):
        kwargs.setdefault("name", name)
        self.tools[kwargs["name"]] = kwargs

    def register_hook(self, name, fn, *_a, **_kw):
        self.hooks.setdefault(name, []).append(fn)

    def register_skill(self, name, *_a, **_kw):
        self.skills.append(name)

    def register_auxiliary_task(self, name, *_a, **_kw):
        self.aux.append(name)

    def __getattr__(self, name):
        if not name.startswith("register_"):
            raise AttributeError(name)
        return lambda *a, **k: self.other.append(name)


def _private_home() -> Path:
    raw = os.environ.get("HERMES_HOME", "")
    if not raw or not os.environ.get("GLIDE_ARMY_FIXTURE"):
        raise SystemExit("army_host: run under the army runner's fixture profile (HERMES_HOME + GLIDE_ARMY_FIXTURE)")
    home = Path(raw)
    home.mkdir(parents=True, exist_ok=True)
    return home


def load() -> FixtureCtx:
    _private_home()
    sys.path[:] = [p for p in sys.path if Path(p or ".").resolve() != ROOT]
    parent = sys.modules.setdefault("hermes_plugins", type(sys)("hermes_plugins"))
    if not hasattr(parent, "__path__"):
        parent.__path__ = []
    spec = importlib.util.spec_from_file_location(PACKAGE, ROOT / "__init__.py", submodule_search_locations=[str(ROOT)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[PACKAGE] = module
    spec.loader.exec_module(module)
    ctx = FixtureCtx()
    module.register(ctx)
    return ctx


def inventory(ctx: FixtureCtx) -> dict:
    return {
        "cli": sorted(ctx.cli), "commands": sorted(ctx.commands), "gateway": sorted(ctx.gateway),
        "rpc": sorted(ctx.rpc), "tools": sorted(ctx.tools), "hooks": sorted(ctx.hooks),
        "skills": sorted(ctx.skills), "aux": sorted(ctx.aux),
    }


def _settle(value):
    """A handler's result, awaited when the handler is a coroutine function."""
    return asyncio.run(value) if inspect.isawaitable(value) else value


def run_command(ctx: FixtureCtx, name: str, arg: str) -> dict:
    entry = ctx.commands.get(name)
    if entry is None:
        return {"ok": False, "error": f"no registered command /{name}"}
    handler = entry["handler"]
    try:
        params = inspect.signature(handler).parameters
        kwargs = {"session_id": SESSION} if "session_id" in params else {}
        out = _settle(handler(arg, **kwargs))
    except Exception as error:  # a crash is the finding, reported in the reply
        return {"ok": False, "error": f"{type(error).__name__}: {error}", "trace": traceback.format_exc()[-TRACE_CHARS:]}
    text = out if isinstance(out, str) else json.dumps(out, default=str)
    return {"ok": True, "output": text}


def run_gateway(ctx: FixtureCtx, method: str, params: dict) -> dict:
    entry = ctx.gateway.get(method)
    if entry is None:
        return {"ok": False, "error": f"no registered gateway method {method}"}
    params = {"session_id": SESSION, **params}
    try:
        schema = entry["schema"]
        if schema is not None:
            schema.model_validate(params)
        out = _settle(entry["handler"](_request(), params))
    except Exception as error:  # a refusal or crash is the finding, reported in the reply
        return {"ok": False, "error": f"{type(error).__name__}: {error}", "trace": traceback.format_exc()[-TRACE_CHARS:]}
    return {"ok": True, "result": json.loads(json.dumps(out, default=str))}


def _parser(ctx: FixtureCtx, name: str) -> tuple[dict, argparse.ArgumentParser]:
    entry = ctx.cli[name]
    parser = argparse.ArgumentParser(prog=f"hermes {name}")
    if entry["setup"] is not None:
        entry["setup"](parser)
    return entry, parser


def run_cli_help(ctx: FixtureCtx, name: str) -> dict:
    if name not in ctx.cli:
        return {"ok": False, "error": f"no registered CLI command hermes {name}"}
    entry, parser = _parser(ctx, name)
    text = parser.format_help()
    return {"ok": bool(text.strip()) and callable(entry["handler"]), "output": text}


def run_cli(ctx: FixtureCtx, name: str, argv: list[str]) -> dict:
    if name not in ctx.cli:
        return {"ok": False, "error": f"no registered CLI command hermes {name}"}
    entry, parser = _parser(ctx, name)
    try:
        code = entry["handler"](parser.parse_args(argv))
    except SystemExit as stop:
        code = stop.code
    except Exception as error:  # a crash is the finding, reported in the reply
        return {"ok": False, "error": f"{type(error).__name__}: {error}", "trace": traceback.format_exc()[-TRACE_CHARS:]}
    return {"ok": True, "exit": 0 if code is None else code}


def run_tool(ctx: FixtureCtx, name: str, args: dict) -> dict:
    entry = ctx.tools.get(name)
    if entry is None or not callable(entry.get("handler")):
        return {"ok": False, "error": f"no registered tool {name}"}
    try:
        out = _settle(entry["handler"](args, session_id=SESSION))
    except Exception as error:  # a crash is the finding, reported in the reply
        return {"ok": False, "error": f"{type(error).__name__}: {error}", "trace": traceback.format_exc()[-TRACE_CHARS:]}
    return {"ok": True, "output": out if isinstance(out, str) else json.dumps(out, default=str)}


def run_hook(ctx: FixtureCtx, name: str, kwargs: dict) -> dict:
    handlers = ctx.hooks.get(name)
    if not handlers:
        return {"ok": False, "error": f"no registered hook {name}"}
    try:
        out = [_settle(fn(**kwargs)) for fn in handlers]
    except Exception as error:  # a crash is the finding, reported in the reply
        return {"ok": False, "error": f"{type(error).__name__}: {error}", "trace": traceback.format_exc()[-TRACE_CHARS:]}
    return {"ok": True, "result": json.loads(json.dumps(out, default=str))}


@contextlib.contextmanager
def _captured():
    """Both Python prints and child processes write to a file, never to the reply channel."""
    sys.stdout.flush()
    sys.stderr.flush()
    saved = os.dup(1), os.dup(2)
    sink = tempfile.TemporaryFile()
    stdin = os.dup(0)
    null = os.open(os.devnull, os.O_RDONLY)
    os.dup2(sink.fileno(), 1)
    os.dup2(sink.fileno(), 2)
    os.dup2(null, 0)
    text = io.StringIO()
    try:
        with contextlib.redirect_stdout(text), contextlib.redirect_stderr(text):
            yield lambda: text.getvalue() + (sink.seek(0) or sink.read().decode("utf-8", "replace"))
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
        os.dup2(saved[0], 1)
        os.dup2(saved[1], 2)
        os.dup2(stdin, 0)
        for fd in (*saved, stdin, null):
            os.close(fd)


def _dispatch(ctx: FixtureCtx, request: dict) -> dict:
    match request.get("op"):
        case "inventory":
            return {"ok": True, "result": inventory(ctx)}
        case "command":
            return run_command(ctx, str(request["name"]), str(request.get("arg", "")))
        case "gateway":
            return run_gateway(ctx, str(request["method"]), dict(request.get("params") or {}))
        case "cli":
            return run_cli_help(ctx, str(request["name"]))
        case "cli_run":
            return run_cli(ctx, str(request["name"]), [str(a) for a in request.get("argv") or []])
        case "tool":
            return run_tool(ctx, str(request["name"]), dict(request.get("args") or {}))
        case "hook":
            return run_hook(ctx, str(request["name"]), dict(request.get("kwargs") or {}))
        case op:
            return {"ok": False, "error": f"unknown op {op!r}"}


def handle(ctx: FixtureCtx, request: dict) -> dict:
    with _captured() as output:
        reply = _dispatch(ctx, request)
        captured = output()
    if captured:
        reply["stdout"] = captured[-OUTPUT_CHARS:]
    return reply


def _request_of(op: str, rest: list[str]) -> dict:
    """The one-shot command line as the request `serve` would read."""
    match op:
        case "command":
            return {"op": op, "name": rest[0], "arg": " ".join(rest[1:])}
        case "gateway":
            return {"op": op, "method": rest[0], "params": json.loads(rest[1]) if len(rest) > 1 else {}}
        case "cli":
            return {"op": op, "name": rest[0]}
        case "cli_run":
            return {"op": op, "name": rest[0], "argv": rest[1:]}
        case "tool":
            return {"op": op, "name": rest[0], "args": json.loads(rest[1]) if len(rest) > 1 else {}}
        case "hook":
            return {"op": op, "name": rest[0], "kwargs": json.loads(rest[1]) if len(rest) > 1 else {}}
        case _:
            return {"op": op}


def serve(ctx: FixtureCtx) -> int:
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            reply = handle(ctx, json.loads(line))
        except Exception as error:  # one bad request must not end the session
            reply = {"ok": False, "error": f"{type(error).__name__}: {error}"}
        sys.stdout.write(json.dumps(reply, default=str) + "\n")
        sys.stdout.flush()
    return 0


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    ctx = load()
    if argv[0] == "serve":
        return serve(ctx)
    reply = handle(ctx, _request_of(argv[0], argv[1:]))
    print(json.dumps(reply, indent=1, default=str))
    return 0 if reply.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

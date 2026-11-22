#!/usr/bin/env python3
"""TesterArmy fixture host: the real plugin, registered and driven headless in a private profile.

The plugin directory loads the way Hermes loads it (a package whose ``register(ctx)`` runs once), on a
recording context instead of a live Hermes. Every registration lands in an inventory the journey runner
checks, and the registered handlers are called exactly as a frontend reaches them:

    army_host.py --fixture-home DIR inventory                      # what register(ctx) wired up, as JSON
    army_host.py --fixture-home DIR command NAME [ARG...]          # a text-plugin slash command (`/glide focus`)
    army_host.py --fixture-home DIR gateway METHOD JSON_PARAMS     # a registered gateway method, attached to the session
    army_host.py --fixture-home DIR cli NAME                       # a registered `hermes NAME` subcommand's parser
    army_host.py --fixture-home DIR cli_run NAME [ARGV...]         # that subcommand run with ARGV, stdin closed, output captured
    army_host.py --fixture-home DIR tool NAME JSON_ARGS            # a registered tool's handler, for the fixture session
    army_host.py --fixture-home DIR hook NAME JSON_KWARGS          # every handler registered for a hook
    army_host.py --fixture-home DIR serve                          # one JSON request per stdin line, one reply per stdout line

``--fixture-home`` must name a profile inside the caller's disposable HOME. The host refuses to run
without this explicit option.
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
import pwd
import sys
import tempfile
import traceback
from enum import StrEnum
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = "hermes_plugins.glide_army"
SESSION = "army-s1"
TRACE_CHARS = 1500  # the tail of a traceback a reply carries
OUTPUT_CHARS = 4000  # the tail of captured stdout/stderr a reply carries


class Operation(StrEnum):
    INVENTORY = "inventory"
    COMMAND = "command"
    GATEWAY = "gateway"
    CLI = "cli"
    CLI_RUN = "cli_run"
    TOOL = "tool"
    HOOK = "hook"
    SERVE = "serve"


class FixtureRequest:
    """The attached caller a registered gateway method sees (the public seam's fields only)."""

    def __init__(self, session_id: str = SESSION, profile: str = "army", attached: bool = True) -> None:
        self.session_id = session_id
        self.profile = profile
        self.attached = attached

    def assert_attached(self) -> None:
        if not self.attached:
            raise PermissionError("fixture caller is detached")

    def capture_scope(self):
        raise PermissionError("gateway scope capture is unavailable in the fixture host")


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

    capabilities: frozenset[str] = frozenset()

    def has_capability(self, capability: str) -> bool:
        return capability in self.capabilities

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


def load() -> FixtureCtx:
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
    params = inspect.signature(handler).parameters
    kwargs = {"session_id": SESSION} if "session_id" in params else {}
    out = _settle(handler(arg, **kwargs))
    text = out if isinstance(out, str) else json.dumps(out, default=str)
    return {"ok": True, "output": text}


def run_gateway(ctx: FixtureCtx, method: str, params: dict) -> dict:
    entry = ctx.gateway.get(method)
    if entry is None:
        return {"ok": False, "error": f"no registered gateway method {method}"}
    params = {"session_id": SESSION, **params}
    schema = entry["schema"]
    if schema is not None:
        schema.model_validate(params)
    try:
        from hermes_cli.plugin_gateway_methods import GatewayRequestContext
    except ImportError:
        caller = FixtureRequest()
    else:
        caller = GatewayRequestContext(session_id=SESSION, profile="army", _attached=lambda: True)
    out = _settle(entry["handler"](caller, params))
    return {"ok": True, "result": json.loads(json.dumps(out, default=str))}


def _parser(ctx: FixtureCtx, name: str) -> tuple[dict, argparse.ArgumentParser]:
    entry = ctx.cli[name]
    parser = argparse.ArgumentParser(prog=f"hermes {name}")
    if entry["setup"] is not None:
        entry["setup"](parser)
    return entry, parser


def run_cli_help(ctx: FixtureCtx, name: str) -> dict:
    entry, parser = _parser(ctx, name)
    text = parser.format_help()
    return {"ok": bool(text.strip()) and callable(entry["handler"]), "output": text}


def run_cli(ctx: FixtureCtx, name: str, argv: list[str]) -> dict:
    entry, parser = _parser(ctx, name)
    try:
        code = entry["handler"](parser.parse_args(argv))
    except SystemExit as stop:
        code = stop.code
    return {"ok": True, "exit": 0 if code is None else code}


def run_tool(ctx: FixtureCtx, name: str, args: dict) -> dict:
    entry = ctx.tools.get(name)
    if entry is None or not callable(entry.get("handler")):
        return {"ok": False, "error": f"no registered tool {name}"}
    out = _settle(entry["handler"](args, session_id=SESSION))
    return {"ok": True, "output": out if isinstance(out, str) else json.dumps(out, default=str)}


def run_hook(ctx: FixtureCtx, name: str, kwargs: dict) -> dict:
    handlers = ctx.hooks.get(name)
    if not handlers:
        return {"ok": False, "error": f"no registered hook {name}"}
    out = [_settle(fn(**kwargs)) for fn in handlers]
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


def handle(ctx: FixtureCtx, request: dict) -> dict:
    with _captured() as output:
        # Catch handler crashes at the request boundary, not in each adapter.
        try:
            op = Operation(request.get("op"))
            match op:
                case Operation.INVENTORY:
                    reply = {"ok": True, "result": inventory(ctx)}
                case Operation.COMMAND:
                    reply = run_command(ctx, str(request["name"]), str(request.get("arg", "")))
                case Operation.GATEWAY:
                    reply = run_gateway(ctx, str(request["method"]), dict(request.get("params") or {}))
                case Operation.CLI | Operation.CLI_RUN:
                    name = str(request["name"])
                    if name not in ctx.cli:
                        reply = {"ok": False, "error": f"no registered CLI command hermes {name}"}
                    elif op == Operation.CLI:
                        reply = run_cli_help(ctx, name)
                    else:
                        reply = run_cli(ctx, name, [str(a) for a in request.get("argv") or []])
                case Operation.TOOL:
                    reply = run_tool(ctx, str(request["name"]), dict(request.get("args") or {}))
                case Operation.HOOK:
                    reply = run_hook(ctx, str(request["name"]), dict(request.get("kwargs") or {}))
                case _:
                    reply = {"ok": False, "error": f"unknown op {op!r}"}
        except (ArithmeticError, AttributeError, ImportError, LookupError, OSError, RuntimeError, TypeError, ValueError) as error:
            reply = {"ok": False, "error": f"{type(error).__name__}: {error}", "trace": traceback.format_exc()[-TRACE_CHARS:]}
        captured = output()
    if captured:
        reply["stdout"] = captured[-OUTPUT_CHARS:]
    return reply


def _request_of(op: Operation, rest: list[str]) -> dict:
    """The one-shot command line as the request `serve` would read."""
    match op:
        case Operation.COMMAND:
            return {"op": op, "name": rest[0], "arg": " ".join(rest[1:])}
        case Operation.GATEWAY:
            return {"op": op, "method": rest[0], "params": json.loads(rest[1]) if len(rest) > 1 else {}}
        case Operation.CLI:
            return {"op": op, "name": rest[0]}
        case Operation.CLI_RUN:
            return {"op": op, "name": rest[0], "argv": rest[1:]}
        case Operation.TOOL:
            return {"op": op, "name": rest[0], "args": json.loads(rest[1]) if len(rest) > 1 else {}}
        case Operation.HOOK:
            return {"op": op, "name": rest[0], "kwargs": json.loads(rest[1]) if len(rest) > 1 else {}}
        case _:
            return {"op": op}


def serve(ctx: FixtureCtx) -> int:
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            reply = handle(ctx, json.loads(line))
        except (ValueError, TypeError) as error:  # malformed JSON must not end the session
            reply = {"ok": False, "error": f"{type(error).__name__}: {error}"}
        sys.stdout.write(json.dumps(reply, default=str) + "\n")
        sys.stdout.flush()
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--fixture-home", required=True, type=Path, help="disposable Hermes fixture profile")
    parser.add_argument("op", choices=list(Operation), type=Operation)
    parser.add_argument("rest", nargs=argparse.REMAINDER)
    args = parser.parse_args(argv)
    home = args.fixture_home.resolve()
    private_root = Path.home().resolve()
    owner_root = Path(pwd.getpwuid(os.getuid()).pw_dir).resolve()
    if private_root == owner_root or home == private_root or not home.is_relative_to(private_root):
        parser.error("fixture profile must be inside the disposable HOME")
    home.mkdir(parents=True, exist_ok=True)
    # Hermes and any subprocesses see only fixture-owned profile and XDG locations.
    os.environ.update({
        "HERMES_HOME": str(home),
        "XDG_CONFIG_HOME": str(private_root / ".config"),
        "XDG_CACHE_HOME": str(private_root / ".cache"),
        "XDG_DATA_HOME": str(private_root / ".local/share"),
        "XDG_STATE_HOME": str(private_root / ".local/state"),
    })
    ctx = load()
    if args.op == Operation.SERVE:
        return serve(ctx)
    reply = handle(ctx, _request_of(args.op, args.rest))
    print(json.dumps(reply, indent=1, default=str))
    return 0 if reply.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

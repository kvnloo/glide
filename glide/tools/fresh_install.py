#!/usr/bin/env python3
"""Exercise the installed /glide command through Hermes, with synthetic history only.

The shell runner owns installation, activation and validation. This driver uses real
plugin discovery, command registration, SessionDB, persistence, recall and hooks.
No chat, gateway or desktop is launched. Optional machine probes are stubbed; Taste
uses an ephemeral loopback HTTP fixture. Model calls are not needed or permitted.
"""
from __future__ import annotations

from contextlib import ExitStack
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import inspect
import ipaddress
import json
import os
from pathlib import Path
import socket
import tempfile
from threading import Thread
from unittest.mock import patch


def check(name: str, ok: bool, result: object) -> None:
    if not ok:
        raise RuntimeError(f"{name}: {result}")
    print(f"PASS {name}: {result}", flush=True)


def isolated_home() -> Path:
    raw = os.environ.get("HERMES_HOME", "")
    if not raw:
        raise RuntimeError("Use the isolated runner, not a real Hermes home")
    home = Path(raw).resolve()
    if not home.is_relative_to(Path(tempfile.gettempdir()).resolve()):
        raise RuntimeError("HERMES_HOME must be inside the temporary directory")
    if not (home / ".glide-e2e").is_file():
        raise RuntimeError("Use the isolated runner, not a real Hermes home")
    return home


def forbidden(*args, **kwargs):
    raise RuntimeError("The new-user flow must not start processes or call a model")


def main() -> None:
    home = isolated_home()  # Check before importing any Hermes module.
    installed = home / "plugins" / "hermes-tern"
    from hermes_cli.plugins import get_plugin_command_handler, get_plugin_manager
    from hermes_state import SessionDB

    manager = get_plugin_manager()
    manager.discover_and_load()
    command = get_plugin_command_handler("glide")
    check("discovery", command is not None, "/glide registered by enabled plugin")
    module_path = Path(inspect.getfile(command)).resolve()
    check("installed-code", module_path.is_relative_to(installed.resolve()), str(module_path))
    import sys
    core = sys.modules[command.__module__]

    def run(args: str, expected: str) -> str:
        result = command(args, session_id="e2e-live")
        check(f"/glide {args}".rstrip(), expected in result, result)
        return result

    def hook(query: str) -> str:
        return "\n".join(str(value.get("context", "")) for value in
                         manager.invoke_hook("pre_llm_call", user_message=query)
                         if isinstance(value, dict))

    real_connect = socket.socket.connect

    def loopback_only(sock, address):
        if not ipaddress.ip_address(address[0]).is_loopback:
            raise RuntimeError("External network access is forbidden during /glide")
        return real_connect(sock, address)

    with ExitStack() as stack:
        # Probe optional integrations at the plugin boundary, never a user's z0int data.
        stack.enter_context(patch.object(core, "_run", return_value=None))
        stack.enter_context(patch.object(core, "_z0int", return_value={"installed": False, "hint": "isolated test"}))
        stack.enter_context(patch("subprocess.Popen", forbidden))
        stack.enter_context(patch.object(socket.socket, "connect", loopback_only))
        print("Boundary stubs: optional hardware/z0int probes. No model calls; process launch forbidden.")
        run("", "corrections kept: 0")
        run("on", "Build your memory first")
        db = SessionDB(db_path=home / "state.db")
        try:
            for sid, source, text in [
                ("e2e-release", "cli", "Correction: Run release tests before publishing packages."),
                ("e2e-frontend", "tui", "Actually, use pnpm for frontend dependencies."),
                ("e2e-cron", "cron", "Correction: Keep cron-only sentinel."),
                ("e2e-live", "cli", "Correction: Keep current-session sentinel."),
            ]:
                db.create_session(sid, source)
                db.append_message(sid, "user", text)
        finally:
            db.close()
        check("synthetic-history", True, "4 sessions, no user transcript read")
        check("hook-before-on", not hook("release tests"), "no injection")
        run("build", "corrections kept: 2")
        state = json.loads((home / "glide" / "memory.json").read_text())
        texts = " ".join(record["text"] for record in state["records"])
        check("scope", "sentinel" not in texts, "cron and current session excluded")
        run("on", "quoted into turns: on")
        check("hook-after-on", "Run release tests" in hook("release tests"), "matching correction quoted")
        check("hook-no-match", not hook("weather forecast"), "no injection")
        run("recall release tests", "Run release tests")
        run("recall weather forecast", "No matching correction.")
        run("off", "quoted into turns: off")
        check("hook-after-off", not hook("release tests"), "no injection")
        recalled = json.loads(command("json recall {\"query\": \"frontend dependencies\"}", session_id="e2e-live"))
        check("/glide json recall", "pnpm" in json.dumps(recalled), recalled)
        run("setup", "recall:")
        check("setup-preserves-opt-in", not core.enabled(home), "memory remains off")
        taste(command)
        check("final-state", core.status(home)["corrections"] == 2 and not core.enabled(home), core.status(home))


def taste(command) -> None:
    class Boards(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path != "/api/boards":
                self.send_error(404)
                return
            body = json.dumps([{"id": "e2e-board", "title": "Synthetic brainstorm"}]).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("localhost", 0), Boards)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with patch.dict(os.environ, {"GLIDE_TASTE_URL": f"http://localhost:{server.server_port}"}):
            result = command("taste", session_id="e2e-live")
            check("/glide taste", "Synthetic brainstorm:" in result and "/s/e2e-board/" in result,
                  f"{result}, fixture /api/boards HTTP 200, no browser opened")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Verify real Hermes registration and Tern routing without opening a desktop.

Run with Hermes on PYTHONPATH. Only the final chat/GUI boundary is intercepted;
registration, argument parsing, channel lookup and memory onboarding are real.
"""
from __future__ import annotations

import argparse
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import signal
import sys
import tempfile
import types

ROOT = Path(__file__).resolve().parents[2]


def package(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(
        name, path / "__init__.py", submodule_search_locations=[str(path)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main() -> None:
    options = argparse.ArgumentParser(description=__doc__)
    options.add_argument("--glide-source", type=Path, default=ROOT / "glide")
    source = options.parse_args().glide_source.resolve()
    # The private home gets a ~1 GB Hermes installs/ tree: keep it off tmpfs, and turn SIGTERM
    # into SystemExit so the with-block still deletes it when a harness times the run out.
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    cache = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache")
    cache.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="glide-launch-verify-", dir=cache) as temporary:
        home = Path(temporary)
        os.environ.update(HERMES_HOME=str(home), HERMES_TERN_CHANNELS=str(home / "channels.json"))
        os.environ.pop("TERN_PANE", None)
        os.environ.pop("HERMES_TERN", None)
        from hermes_cli import main as cli
        from hermes_cli.plugins import PluginContext, PluginManifest, get_plugin_manager
        from hermes_state import SessionDB

        tern = package("verify_tern", ROOT)
        glide = package("verify_glide", source)
        manager = get_plugin_manager()
        tern_context = PluginContext(PluginManifest(name="hermes-tern", path=str(ROOT)), manager)
        tern.register(tern_context)
        glide.register(PluginContext(PluginManifest(name="glide", path=str(source)), manager))
        assert manager._cli_commands["glide"]["plugin"] == "glide"
        parser = argparse.ArgumentParser(prog="hermes")
        parser.add_argument("--tui", action="store_true")
        subparsers = parser.add_subparsers(dest="command", required=True)
        for entry in manager._cli_commands.values():
            cli._attach_plugin_cli_command(subparsers, entry)

        # Synthetic channel has no alias. Nothing reads or writes the user's registry.
        channel = home / "channel" / "frontend"
        (channel / "dist").mkdir(parents=True)
        (channel / "dist" / "entry.js").write_text("// synthetic launch boundary\n")
        registry = home / "channels.json"
        registry.write_text(json.dumps({"version": 1, "channels": {"glide": {"dir": str(channel.parent)}}}))
        before = registry.read_bytes()
        chats = []
        # The launcher's last step spawns node on the channel bundle; record it instead.
        tern.launcher.subprocess = types.SimpleNamespace(
            call=lambda argv, env=None: chats.append(argv[-1]) or 0)
        for argv in (["glide"], ["--tui", "glide"]):
            args = parser.parse_args(argv)
            try:
                args.func(args)
            except SystemExit as done:
                assert done.code == 0, done.code
            assert chats[-1] == str(channel / "dist" / "entry.js"), chats
        assert registry.read_bytes() == before

        # Exercise onboarding through the same CLI parser and real persistence API.
        db = SessionDB(db_path=home / "state.db")
        try:
            db.create_session("launch-check", "cli")
            db.append_message("launch-check", "user", "Correction: keep launch checks isolated.")
        finally:
            db.close()
        output = io.StringIO()
        args = parser.parse_args(["glide", "onboard", "--json"])
        with contextlib.redirect_stdout(output):
            assert args.func(args) == 0
        receipt = json.loads(output.getvalue())
        assert receipt["ok"] and not receipt["on"]
        assert not glide.core.enabled(home)
        assert len(chats) == 2, "onboard must not enter Tern"

        # Missing Tern must still select the normal Hermes TUI and restore argv.
        manager._cli_commands.pop("tern")
        fallback = []
        cli.main = lambda: fallback.append(sys.argv[1:]) or 0
        saved = sys.argv
        args = parser.parse_args(["glide"])
        assert args.func(args) == 0
        assert fallback == [["chat", "--tui"]] and sys.argv is saved
        print(json.dumps({"ok": True, "channel_without_alias": True, "tui_flag": True,
                          "onboard": True, "memory_off": True, "fallback": True,
                          "registry_unchanged": True, "desktop_opened": False}))


if __name__ == "__main__":
    main()

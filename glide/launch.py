"""Launch through Hermes' registered Tern command, without a second interpreter."""

from __future__ import annotations

import sys


def start(args) -> int:
    from hermes_cli.plugins import get_plugin_manager

    tern = get_plugin_manager()._cli_commands.get("tern")
    if tern:
        handler = tern["handler_fn"]
        channels = sys.modules[handler.__module__].channels
        args.tui_args = ["--channel", "glide"] if "glide" in channels.load() else []
        return handler(args)

    from hermes_cli.main import main

    saved = sys.argv
    flags = ["--worktree"] if getattr(args, "worktree", False) else []
    sys.argv = [saved[0], "chat", "--tui", *flags]
    try:
        return main()
    finally:
        sys.argv = saved

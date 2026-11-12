"""The plugin's own data folder, ``<HERMES_HOME>/plugin-data/glide/`` (Hermes' ``plugin_data_dir``)."""

from __future__ import annotations

import contextlib
import shutil
from pathlib import Path

PLUGIN = "glide"
LEGACY = "hermes-tern"  # the plugin's name before the rename; its folders move over once


def folder(name: str) -> Path:
    """The subfolder ``name`` of the plugin's data folder, created when missing."""
    from plugins.plugin_storage import plugin_data_dir

    path = plugin_data_dir(PLUGIN) / name
    path.mkdir(parents=True, exist_ok=True)
    return path


def migrate_legacy(home: Path) -> None:
    """Move ``plugin-data/<LEGACY>`` and ``<LEGACY>/settings.json`` to the ``glide`` names,
    once: nothing moves when the new location already exists, so newer data is never overwritten."""
    moves = ((home / "plugin-data" / LEGACY, home / "plugin-data" / PLUGIN),
             (home / LEGACY / "settings.json", home / PLUGIN / "settings.json"))
    for old, new in moves:
        if old.exists() and not new.exists():
            with contextlib.suppress(OSError):
                new.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(old), str(new))

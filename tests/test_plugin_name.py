"""The plugin installs as ``glide``: manifest, data folders, config keys and namespaces agree, and a
profile that ran the old ``hermes-tern`` name keeps its data after the rename."""

from __future__ import annotations

import json
import re
from pathlib import Path

from hermes_tern_plugin import browser_backend, plugin_data, pull_requests, table_chart_gateway

ROOT = Path(__file__).resolve().parents[1]


def test_manifest_and_constants_use_glide():
    manifest = (ROOT / "plugin.yaml").read_text()
    assert re.search(r"^name: glide$", manifest, re.M)
    assert plugin_data.PLUGIN == browser_backend.PLUGIN == pull_requests.PLUGIN == "glide"
    assert pull_requests.TOOLSET == "glide"
    assert pull_requests.CONFIG_PATH == "plugins.entries.glide.settings.enterprise_hosts"


def test_table_policy_reads_glide_settings(tmp_path, monkeypatch):
    home = tmp_path / "hermes"
    (home / "glide").mkdir(parents=True)
    (home / "glide" / "settings.json").write_text(json.dumps({"tableCharts": "smart"}))
    import hermes_constants
    monkeypatch.setattr(hermes_constants, "get_hermes_home", lambda: home, raising=False)
    monkeypatch.setattr(table_chart_gateway, "get_hermes_home", lambda: home)
    assert table_chart_gateway._owner_mode() == "smart"


def test_legacy_data_moves_once(tmp_path):
    home = tmp_path / "hermes"
    legacy = home / "plugin-data" / "hermes-tern" / "panes"
    legacy.mkdir(parents=True)
    (legacy / "a.json").write_text("{}")
    (home / "hermes-tern").mkdir()
    (home / "hermes-tern" / "settings.json").write_text('{"theme": "x"}')

    plugin_data.migrate_legacy(home)

    assert (home / "plugin-data" / "glide" / "panes" / "a.json").read_text() == "{}"
    assert not (home / "plugin-data" / "hermes-tern").exists()
    assert (home / "glide" / "settings.json").read_text() == '{"theme": "x"}'

    # A second run, or a profile that already has new data, never overwrites it.
    (home / "plugin-data" / "hermes-tern").mkdir()
    (home / "plugin-data" / "hermes-tern" / "stale.json").write_text("old")
    plugin_data.migrate_legacy(home)
    assert not (home / "plugin-data" / "glide" / "stale.json").exists()
    assert (home / "glide" / "settings.json").read_text() == '{"theme": "x"}'


def test_no_hermes_tern_names_outside_attribution():
    """Every remaining ``hermes-tern`` in Python sources is upstream attribution."""
    allowed = ("alt-glitch/hermes-tern", "kvnloo/hermes-tern", "hermes-tern-version-launches",
               "LEGACY")
    for path in ROOT.glob("*.py"):
        for line in path.read_text().splitlines():
            if "hermes-tern" in line:
                assert any(a in line for a in allowed), f"{path.name}: {line}"

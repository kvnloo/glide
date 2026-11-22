"""GL-102: Glide wears the shared theme file (kvnloo/ephemeral-ui theme/glide.json) from its pinned copy. The pin
fails a hand edit, a stale copy and a catalog kind it does not know; a token changed in the file shows in the
dash window theme Tern installs and in the landing page's tokens."""

from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import shutil
from pathlib import Path

import pytest

from glide_plugin import whole_theme

GLIDE = Path(__file__).resolve().parents[1]
SHARED = GLIDE / "themes" / "shared"


def _tool(name: str):
    spec = importlib.util.spec_from_file_location(name, GLIDE / "tools" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _theme() -> dict:
    return json.loads((SHARED / "glide.json").read_text())


def _upstream(root: Path, kinds: list[str], version: str = "0.1.0") -> Path:
    """An ephemeral-ui checkout as far as the check reads it: the theme files and the catalog."""
    (root / "theme").mkdir(parents=True)
    (root / "catalog").mkdir()
    for name in ("glide.json", "tokens.schema.json"):
        shutil.copyfile(SHARED / name, root / "theme" / name)
    (root / "catalog" / "catalog.json").write_text(json.dumps({"v": 0, "version": version, "kinds": [{"kind": k} for k in kinds]}))
    return root


def test_the_pinned_copy_matches_its_pin(capsys):
    check = _tool("check_shared_theme")
    pin = check.pin()
    assert pin["repo"] == "kvnloo/ephemeral-ui" and len(pin["sha"]) == 40
    assert len(pin["catalog"]["kinds"]) == 89
    assert check.main([]) == 0
    assert "matches the pin" in capsys.readouterr().out


def test_a_hand_edited_copy_fails(tmp_path, monkeypatch, capsys):
    check = _tool("check_shared_theme")
    shared = tmp_path / "shared"
    shutil.copytree(SHARED, shared)
    theme = _theme()
    theme["color"]["dark"]["bg"] = "#000000"
    (shared / "glide.json").write_text(json.dumps(theme))
    monkeypatch.setattr(check, "SHARED", shared)
    monkeypatch.setattr(check, "PIN", shared / "PIN.json")
    assert check.main([]) == 1
    assert "glide.json: differs from the pinned" in capsys.readouterr().out


def test_upstream_at_the_pin_passes_and_a_changed_theme_is_stale(tmp_path, capsys):
    check = _tool("check_shared_theme")
    kinds = check.pin()["catalog"]["kinds"]
    same = _upstream(tmp_path / "same", kinds)
    assert check.main(["--upstream", str(same)]) == 0

    moved = _upstream(tmp_path / "moved", kinds)
    theme = _theme()
    theme["version"] = "0.2.0"
    (moved / "theme" / "glide.json").write_text(json.dumps(theme))
    capsys.readouterr()
    assert check.main(["--upstream", str(moved)]) == 1
    assert "theme/glide.json: upstream changed since" in capsys.readouterr().out


def test_a_new_catalog_kind_is_named_as_uncovered(tmp_path, capsys):
    check = _tool("check_shared_theme")
    kinds = check.pin()["catalog"]["kinds"]
    grown = _upstream(tmp_path / "grown", [*kinds, "weather"], version="0.2.0")
    assert check.main(["--upstream", str(grown)]) == 1
    out = capsys.readouterr().out
    assert "1 kind(s) not covered by the pin: weather" in out
    assert "catalog: version 0.2.0 upstream, 0.1.0 pinned" in out


def test_vendoring_records_the_commit_and_hashes(tmp_path, monkeypatch):
    check = _tool("check_shared_theme")
    src = _upstream(tmp_path / "src", ["inbox", "chat"])
    import subprocess
    subprocess.run(["git", "init", "-q", str(src)], check=True)
    subprocess.run(["git", "-C", str(src), "-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-q", "--allow-empty", "-m", "x"], check=True)
    shared = tmp_path / "out"
    monkeypatch.setattr(check, "SHARED", shared)
    monkeypatch.setattr(check, "PIN", shared / "PIN.json")
    pin = check.vendor(src)
    assert pin["catalog"]["kinds"] == ["inbox", "chat"]
    assert pin["files"]["theme/glide.json"] == hashlib.sha256((SHARED / "glide.json").read_bytes()).hexdigest()
    assert check.main([]) == 0


def test_the_shipped_dash_theme_is_the_shared_night():
    """glide/themes/dash.json is what install_themes writes: regenerate it when the pin moves."""
    assert (GLIDE / "themes" / "dash.json").read_bytes() == whole_theme.dash_theme_bytes()
    night = _theme()["color"]["dark"]
    vars_ = whole_theme.dash_theme()["vars"]
    assert {k: vars_[k] for k in whole_theme.DASH_VARS} == {k: night[v] for k, v in whole_theme.DASH_VARS.items()}


def test_a_token_changed_in_the_shared_file_shows_in_the_window_theme_and_the_site():
    theme = copy.deepcopy(_theme())
    theme["color"]["dark"]["bg"] = "#101820"
    theme["color"]["dark"]["primary"] = "#40c0a0"
    theme["brand"]["accent"] = "#40c0a0"
    theme["radius"]["card"] = 20
    worn = whole_theme.dash_theme(theme)["vars"]
    assert worn["background"] == "#101820" and worn["primary"] == "#40c0a0"
    site = _tool("site_tokens").render((GLIDE / "frontend" / "tokens.ts").read_text(), theme)
    assert "--dash-bg: #101820;" in site and "--night-canvas: #101820;" in site
    assert "--dash-gold: #40c0a0;" in site and "--r-card: 20px;" in site


def test_an_unknown_theme_shape_is_refused(tmp_path, monkeypatch):
    theme = _theme()
    theme["v"] = 1
    path = tmp_path / "glide.json"
    path.write_text(json.dumps(theme))
    monkeypatch.setattr(whole_theme, "SHARED", path)
    with pytest.raises(ValueError, match="Glide reads v 0"):
        whole_theme.dash_theme()

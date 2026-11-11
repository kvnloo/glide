"""Safety and fail-closed checks for the isolated new-user runner."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[2]
DRIVER = ROOT / "glide" / "tools" / "fresh_install.py"


def driver():
    spec = importlib.util.spec_from_file_location("fresh_install", DRIVER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_entrypoint_is_valid_shell():
    for path in (ROOT / "scripts" / "e2e-fresh-install.sh",
                 ROOT / "glide" / "tools" / "e2e-fresh-install.sh"):
        subprocess.run(["bash", "-n", str(path)], check=True)


def test_runner_refuses_an_unmarked_home_before_importing_hermes(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    before = set(tmp_path.iterdir())
    with pytest.raises(RuntimeError, match="isolated runner"):
        driver().isolated_home()
    assert set(tmp_path.iterdir()) == before


def test_runner_refuses_a_marked_home_outside_the_temp_directory(tmp_path, monkeypatch):
    (tmp_path / ".glide-e2e").touch()
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setattr(driver().tempfile, "gettempdir", lambda: str(tmp_path / "other"))
    with pytest.raises(RuntimeError, match="temporary directory"):
        driver().isolated_home()


def test_a_failed_step_is_never_logged_as_passed(capsys):
    with pytest.raises(RuntimeError, match="recall"):
        driver().check("recall", False, "wrong result")
    assert "PASS" not in capsys.readouterr().out


def test_the_runner_replaces_inherited_home_and_does_not_inherit_credentials(tmp_path):
    # A failing uv stops before any clone, but after the shell's isolation boundary.
    from shlex import quote
    fake_uv = tmp_path / "uv"
    fake_uv.write_text("#!/bin/sh\n[ -z \"${E2E_SECRET_CANARY:-}\" ] || exit 91\n"
                       f"[ \"$HOME\" != {quote(str(tmp_path))} ] || exit 92\n"
                       f"[ \"$HERMES_HOME\" != {quote(str(tmp_path))} ] || exit 93\nexit 73\n")
    fake_uv.chmod(0o755)
    import os
    env = {**os.environ, "PATH": f"{tmp_path}:/usr/bin:/bin", "E2E_SECRET_CANARY": "synthetic",
           "E2E_ORIGINAL_HOME": str(tmp_path), "HERMES_HOME": str(tmp_path)}
    before = set(tmp_path.iterdir())
    run = subprocess.run(["bash", str(ROOT / "scripts" / "e2e-fresh-install.sh")],
                         env=env, capture_output=True, text=True, timeout=15)
    assert run.returncode == 73, run.stdout + run.stderr
    assert "FAIL bootstrap exit=73" in run.stdout + run.stderr
    assert set(tmp_path.iterdir()) == before

"""The artifact scan checks staged content, independently of Git diff rules."""

import subprocess
import sys
from pathlib import Path

CHECK = Path(__file__).resolve().parents[1] / "tools" / "check_privacy.py"


def scan(directory):
    return subprocess.run(
        [sys.executable, str(CHECK), "--directory", str(directory)],
        capture_output=True, text=True,
    )


def test_scan_clean_artifact(tmp_path):
    (tmp_path / "index.html").write_text("<h1>Glide</h1>", encoding="utf-8")
    result = scan(tmp_path)
    assert result.returncode == 0
    assert "0 finding(s) in 1 artifact file(s)" in result.stdout


def test_scan_ignores_git_diff_waivers_and_exclusions(tmp_path):
    nested = tmp_path / "nested"
    nested.mkdir()
    (nested / "uv.lock").write_text(
        "BEGIN " + "PRIVATE KEY  # privacy: ok", encoding="utf-8",
    )
    result = scan(tmp_path)
    assert result.returncode == 1
    assert "nested/uv.lock:1: credential" in result.stdout
    assert "PRIVATE KEY" not in result.stdout


def test_scan_rejects_empty_artifact(tmp_path):
    assert scan(tmp_path).returncode == 1


def test_scan_rejects_symlink(tmp_path):
    target = tmp_path / "index.html"
    target.write_text("Glide", encoding="utf-8")
    (tmp_path / "alias.html").symlink_to(target)
    result = scan(tmp_path)
    assert result.returncode == 1
    assert "not a regular file: alias.html" in result.stderr


def test_scan_rejects_non_utf8(tmp_path):
    (tmp_path / "asset").write_bytes(b"\xff")
    result = scan(tmp_path)
    assert result.returncode == 1
    assert "cannot read as UTF-8: asset" in result.stderr

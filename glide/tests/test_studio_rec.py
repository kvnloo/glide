"""glide/tools/studio.sh rec: 60 fps by default, STUDIO_FPS overrides, and the capture check rejects off-rate takes.

wf-recorder is faked (no sway here); the fake encodes a real clip with ffmpeg at the rate it was asked for,
or at FAKE_RATE when set, so the check runs the real ffprobe on a real MP4.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest

STUDIO = Path(__file__).resolve().parents[1] / "tools" / "studio.sh"

pytestmark = pytest.mark.skipif(
    not (shutil.which("ffmpeg") and shutil.which("ffprobe") and shutil.which("timeout")),
    reason="needs ffmpeg, ffprobe and coreutils timeout")

FAKE_RECORDER = r"""#!/usr/bin/env bash
# Fake wf-recorder: log the args, encode 1 s of test video at -r (or FAKE_RATE), then wait for timeout's SIGINT.
printf '%s\n' "$@" > "$FAKE_LOG"
rate="" out=""
while [ $# -gt 0 ]; do case "$1" in -r) rate=$2; shift ;; -f) out=$2; shift ;; esac; shift; done
ffmpeg -v error -y -f lavfi -i "testsrc=size=160x90:rate=${FAKE_RATE:-$rate}" -t 1 -c:v libx264 -pix_fmt yuv420p "$out"
[ -n "${FAKE_WAIT:-}" ] || exit 0
trap 'exit 0' INT
sleep 30 & wait
"""


@pytest.fixture
def studio(tmp_path):
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    recorder = bin_dir / "wf-recorder"
    recorder.write_text(FAKE_RECORDER)
    recorder.chmod(0o755)
    log = tmp_path / "recorder.args"

    def run(*args, **env):
        full = {**os.environ, "PATH": f"{bin_dir}:{os.environ['PATH']}", "STUDIO": str(tmp_path / "run"),
                "SWAY": "/bin/true", "TERN": "/bin/true", "FAKE_LOG": str(log)}
        full.pop("STUDIO_FPS", None)
        full.update(env)
        return subprocess.run(["bash", str(STUDIO), *args], env=full, capture_output=True, text=True,
                              timeout=60, cwd=tmp_path)

    run.log = log
    return run


def recorded_rate(log: Path) -> str:
    args = log.read_text().splitlines()
    return args[args.index("-r") + 1]


def test_rec_defaults_to_60_fps_and_passes_the_check(studio, tmp_path):
    result = studio("rec", str(tmp_path / "take.mp4"), "5")
    assert result.returncode == 0, result.stderr
    assert recorded_rate(studio.log) == "60"
    assert "take ok" in result.stdout and "want 60" in result.stdout


def test_rec_succeeds_when_timeout_ends_the_take(studio, tmp_path):
    result = studio("rec", str(tmp_path / "take.mp4"), "2", FAKE_WAIT="1")
    assert result.returncode == 0, result.stderr
    assert "take ok" in result.stdout


def test_studio_fps_overrides_the_rate(studio, tmp_path):
    result = studio("rec", str(tmp_path / "take30.mp4"), "5", STUDIO_FPS="30")
    assert result.returncode == 0, result.stderr
    assert recorded_rate(studio.log) == "30"
    assert "want 30" in result.stdout


def test_rec_rejects_a_take_whose_real_rate_is_not_60(studio, tmp_path):
    result = studio("rec", str(tmp_path / "slow.mp4"), "5", FAKE_RATE="30")
    assert result.returncode == 1
    assert "REJECT take" in result.stderr and "30.00 fps" in result.stderr


def test_check_subcommand_on_an_existing_take(studio, tmp_path):
    take = tmp_path / "take.mp4"
    assert studio("rec", str(take), "5", STUDIO_FPS="30").returncode == 0
    assert studio("check", str(take)).returncode == 1
    assert studio("check", str(take), STUDIO_FPS="30").returncode == 0


def test_bad_studio_fps_is_refused_before_recording(studio, tmp_path):
    result = studio("rec", str(tmp_path / "x.mp4"), "5", STUDIO_FPS="sixty")
    assert result.returncode == 2
    assert "whole number" in result.stderr
    assert not studio.log.exists()

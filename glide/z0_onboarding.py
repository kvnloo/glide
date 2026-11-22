"""Delegate optional onboarding and its checkpoint to the installed z0int CLI."""
from __future__ import annotations

import json
import os
import re
import shutil
import signal
import subprocess
from contextlib import suppress
from threading import Lock

from .child_env import child_env

STEPS = (
    "layout", "doctor", "models.plan", "models.sync", "evolution_lab",
    "omp_plugins", "data.discover", "privacy", "env_hints",
)
_SETUP = Lock()
_PLAN_TIMEOUT = 10
_APPLY_TIMEOUT = 90


def _models(value: object) -> list[str]:
    if not isinstance(value, list):
        raise ValueError
    # Only model identifiers, never arbitrary CLI diagnostics or local paths.
    return [name for name in value[:10] if isinstance(name, str)
            and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,47}", name)]


def _step_status(result: object) -> str:
    match result:
        case {"ok": True, "skipped": True, "reason": "already_done"}:
            return "already done"
        case {"ok": True, "skipped": True}:
            return "skipped"
        case {"ok": True}:
            return "done"
        case dict():
            return "needs attention"
        case _:
            return "not run"


def _report(raw: dict, code: int) -> dict:
    results = raw.get("results")
    if raw.get("schema") != "z0int.onboard_report.v1" or not isinstance(results, dict) or code not in (0, 1):
        raise ValueError
    steps = {step: _step_status(results.get(step)) for step in STEPS}
    ok = (code == 0 and raw.get("ok") is True
          and all(s in {"done", "already done", "skipped"} for s in steps.values()))
    return {"status": "done" if ok else "incomplete", "steps": steps}


def _run_cli(args: list[str], *, timeout: int) -> subprocess.CompletedProcess:
    env = child_env(("HERMES_HOME", "Z0INT_HOME", "SKIP_EVOLUTION_LAB"),
                    {"GIT_TERMINAL_PROMPT": "0", "PIP_NO_INPUT": "1"})
    # An interrupted setup can resume only after its git/pip children have stopped.
    posix = os.name == "posix"
    with subprocess.Popen(args, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                          stderr=subprocess.DEVNULL, text=True, env=env,
                          start_new_session=posix) as process:
        try:
            stdout, _ = process.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            if posix:
                with suppress(ProcessLookupError):
                    os.killpg(process.pid, signal.SIGKILL)
            else:
                process.kill()
            raise
    return subprocess.CompletedProcess(args, process.returncode, stdout)


def _invoke(exe: str, apply: bool) -> dict:
    args = ["onboard", "--json"] if apply else ["models", "plan", "--json"]
    try:
        done = _run_cli([exe, *args], timeout=_APPLY_TIMEOUT if apply else _PLAN_TIMEOUT)
        raw = json.loads(done.stdout)
        if not isinstance(raw, dict):
            raise ValueError
        if apply:
            return _report(raw, done.returncode)
        if done.returncode or raw.get("schema") != "z0int.models_plan.v1":
            raise ValueError
        return {"status": "plan", "resident": _models(raw.get("resident")),
                "on_demand": _models(raw.get("on_demand"))}
    except subprocess.TimeoutExpired:
        return {"status": "timed out"}
    except (OSError, ValueError, RecursionError):
        return {"status": "unavailable"}


def run(*, apply: bool = False) -> dict:
    exe = shutil.which("z0int")
    if not exe:
        return {"status": "not installed"}
    if not apply:
        return _invoke(exe, False)
    if not _SETUP.acquire(blocking=False):
        return {"status": "already running"}
    try:
        return _invoke(exe, True)
    finally:
        _SETUP.release()

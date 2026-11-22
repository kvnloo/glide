"""Delegate optional onboarding and its checkpoint to the installed z0int CLI."""
from __future__ import annotations

import json
import re
import subprocess
from threading import Lock

from . import core
from .child_env import child_env

STEPS = (
    "layout", "doctor", "models.plan", "models.sync", "evolution_lab",
    "omp_plugins", "data.discover", "privacy", "env_hints",
)
_SETUP = Lock()


def _models(value: object) -> list[str]:
    if not isinstance(value, list):
        raise ValueError
    # Only model identifiers, never arbitrary CLI diagnostics or local paths.
    return [name for name in value[:10] if isinstance(name, str)
            and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,47}", name)]


def _steps(results: dict) -> dict:
    steps = {}
    for step in STEPS:
        result = results.get(step)
        if not isinstance(result, dict):
            state = "not run"
        elif result.get("ok") is not True:
            state = "needs attention"
        elif result.get("reason") == "already_done" and result.get("skipped") is True:
            state = "already done"
        elif result.get("skipped") is True:
            state = "skipped"
        else:
            state = "done"
        steps[step] = state
    return steps


def _report(raw: dict, code: int) -> dict:
    results = raw.get("results")
    if raw.get("schema") != "z0int.onboard_report.v1" or not isinstance(results, dict) or code not in (0, 1):
        raise ValueError
    steps = _steps(results)
    ok = (code == 0 and raw.get("ok") is True
          and all(s in {"done", "already done", "skipped"} for s in steps.values()))
    return {"status": "done" if ok else "incomplete", "steps": steps}


def _invoke(argv: list[str], apply: bool) -> dict:
    args = ["onboard", "--json"] if apply else ["models", "plan", "--json"]
    try:
        done = subprocess.run(
            [*argv, *args], stdin=subprocess.DEVNULL, capture_output=True, text=True,
            env=child_env(("HERMES_HOME", "Z0INT_HOME", "SKIP_EVOLUTION_LAB"),
                          {"GIT_TERMINAL_PROMPT": "0", "PIP_NO_INPUT": "1"}),
            timeout=90 if apply else 10, check=False,
        )
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
    argv = core.z0int_argv()
    if not argv:
        return {"status": "not installed"}
    if not apply:
        return _invoke(argv, False)
    if not _SETUP.acquire(blocking=False):
        return {"status": "already running"}
    try:
        return _invoke(argv, True)
    finally:
        _SETUP.release()

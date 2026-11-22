import json
import subprocess

import pytest

from glide_plugin import core, gateway, z0_onboarding


def test_optional_cli_absent(monkeypatch):
    monkeypatch.setattr(core, "z0int_argv", lambda: None)
    assert z0_onboarding.run() == {"status": "not installed"}


def test_preview_is_read_only_and_drops_upstream_paths(tmp_path, monkeypatch):
    monkeypatch.setattr(core, "z0int_argv", lambda: ["z0int"])
    monkeypatch.setenv("OPENAI_API_KEY", "fixture-key")
    monkeypatch.setenv("Z0INT_HOME", str(tmp_path))

    def run(args, **kwargs):
        assert args == ["z0int", "models", "plan", "--json"]
        assert kwargs["env"]["Z0INT_HOME"] == str(tmp_path)
        assert "OPENAI_API_KEY" not in kwargs["env"]
        return subprocess.CompletedProcess(args, 0, json.dumps({
            "schema": "z0int.models_plan.v1", "resident": ["small-model", str(tmp_path)],
            "on_demand": [], "local_dir": str(tmp_path)
        }))

    monkeypatch.setattr(z0_onboarding.subprocess, "run", run)
    assert gateway.call(tmp_path, "z0_onboard", {"session_id": "live"}) == {
        "status": "plan", "resident": ["small-model"], "on_demand": []
    }
    assert json.loads(core.command("onboard"))["status"] == "plan"
    with pytest.raises(ValueError):
        gateway.call(tmp_path, "z0_onboard", {"session_id": "live", "apply": "true"})
    assert not list(tmp_path.iterdir())


def test_partial_run_and_resume_use_the_same_safe_cli(tmp_path, monkeypatch):
    monkeypatch.setattr(core, "z0int_argv", lambda: ["z0int"])
    results = {
        "layout": {"ok": True, "root": str(tmp_path)},
        "doctor": {"ok": False, "error": str(tmp_path)}
    }

    def run(args, **_kwargs):
        # In particular, never pass --force, --sync-models or the upstream writeful --dry-run.
        assert args == ["z0int", "onboard", "--json"]
        ok = results["doctor"]["ok"]
        return subprocess.CompletedProcess(args, 0 if ok else 1, json.dumps({
            "schema": "z0int.onboard_report.v1", "ok": ok, "results": results,
            "state_path": str(tmp_path)
        }))

    monkeypatch.setattr(z0_onboarding.subprocess, "run", run)
    params = {"session_id": "live", "apply": True}
    partial = gateway.call(tmp_path, "z0_onboard", params)
    assert partial["status"] == "incomplete"
    assert partial["steps"]["doctor"] == "needs attention"
    assert partial["steps"]["privacy"] == "not run"
    assert str(tmp_path) not in json.dumps(partial)
    results.update({step: {"ok": True} for step in z0_onboarding.STEPS})
    results["layout"].update(skipped=True, reason="already_done")
    results["models.sync"].update(skipped=True)
    resumed = gateway.call(tmp_path, "z0_onboard", params)
    assert resumed["status"] == "done"
    assert resumed["steps"]["layout"] == "already done"
    assert resumed["steps"]["models.sync"] == "skipped"


@pytest.mark.parametrize(("failure", "status"), [
    (subprocess.TimeoutExpired("z0int", 90), "timed out"),
    (FileNotFoundError("private executable"), "unavailable"),
])
def test_process_error_never_reaches_card(monkeypatch, failure, status):
    monkeypatch.setattr(core, "z0int_argv", lambda: ["z0int"])

    def run(*_args, **_kwargs):
        raise failure

    monkeypatch.setattr(z0_onboarding.subprocess, "run", run)
    assert z0_onboarding.run(apply=True) == {"status": status}


def test_invalid_report_cannot_claim_success(monkeypatch):
    monkeypatch.setattr(core, "z0int_argv", lambda: ["z0int"])
    monkeypatch.setattr(z0_onboarding.subprocess, "run",
                        lambda *_a, **_kw: subprocess.CompletedProcess([], 0, "[]"))
    assert z0_onboarding.run(apply=True) == {"status": "unavailable"}

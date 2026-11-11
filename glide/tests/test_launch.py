"""CLI regression checks. No real profile, gateway or desktop is opened."""

import argparse
import sys
from types import SimpleNamespace

import pytest

from glide_plugin import core, onboarding


def parser():
    result = argparse.ArgumentParser()
    core._setup_cli(result)
    return result


def test_bare_glide_is_valid_and_onboard_keeps_its_options():
    assert parser().parse_args([]).glide_command is None
    args = parser().parse_args(["onboard", "--json", "--limit", "5"])
    assert args.glide_command == "onboard" and args.json and args.limit == 5


@pytest.mark.parametrize("channels,expected", [({}, None), ({"glide": {}}, "glide")])
def test_bare_glide_routes_through_registered_tern(monkeypatch, channels, expected):
    from glide_plugin import launch

    calls = []
    fake = SimpleNamespace(channels=SimpleNamespace(load=lambda: channels))

    def run(args):
        calls.append(getattr(args, "channel", None))
        return 7

    monkeypatch.setitem(sys.modules, run.__module__, fake)
    entry = {"handler_fn": run}
    monkeypatch.setitem(sys.modules, "hermes_cli.plugins", SimpleNamespace(
        get_plugin_manager=lambda: SimpleNamespace(_cli_commands={"tern": entry})))
    assert launch.start(parser().parse_args([])) == 7
    assert calls == [expected]


def test_without_tern_starts_normal_tui_and_restores_argv(monkeypatch):
    from glide_plugin import launch

    calls = []
    original = sys.argv
    monkeypatch.setitem(sys.modules, "hermes_cli.plugins", SimpleNamespace(
        get_plugin_manager=lambda: SimpleNamespace(_cli_commands={})))
    monkeypatch.setitem(sys.modules, "hermes_cli.main", SimpleNamespace(
        main=lambda: calls.append(sys.argv[1:]) or 0))
    assert launch.start(parser().parse_args([])) == 0
    assert calls == [["chat", "--tui"]]
    assert sys.argv is original


def test_onboard_still_uses_onboarding(monkeypatch):
    monkeypatch.setattr(onboarding, "cli", lambda args: 19)
    assert core._cli(parser().parse_args(["onboard"])) == 19

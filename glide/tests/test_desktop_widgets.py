import sys
from types import SimpleNamespace

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
from fastapi import FastAPI
from fastapi.testclient import TestClient

from glide_plugin import ui
from glide_plugin.desktop.widgets_api import project, router

MOUNT = {"id": "focus", "source": "clock.focus", "slot": "above-composer", "minutes": 25,
         "program": 'root = GlideCard("focus", [Hero("left"), Meter("meter")])'}


def test_desktop_mount_persists_and_unmount_reaches_endpoint(tmp_path, monkeypatch):
    homes = [tmp_path / "a", tmp_path / "b"]
    selected = homes[0]
    monkeypatch.setitem(sys.modules, "hermes_constants", SimpleNamespace(get_hermes_home=lambda: selected))
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    assert client.get("/widgets").json() == {"widgets": []}
    assert ui.mount(homes[0], MOUNT, wait=0, now=123)["ok"]
    expected = {"widgets": [{"id": "focus", "end": 1_623_000, "duration": 1_500_000, "parts": ["Hero", "Meter"]}]}
    assert client.get("/widgets").json() == expected
    selected = homes[1]
    assert client.get("/widgets").json() == {"widgets": []}
    selected = homes[0]
    assert TestClient(app).get("/widgets").json() == expected
    assert ui.unmount(homes[0], {"id": "focus"})["ok"]
    assert client.get("/widgets").json() == {"widgets": []}


@pytest.mark.parametrize("patch", [
    {"slot": "below-composer"},
    {"slot": []},
    {"source": "git.commits"},
    {"minutes": True},
    {"startedAt": 2**54},
    {"program": 'root = GlideCard("focus", [Hero("left"), Hero("left")])'},
    {"program": 'root = GlideCard("focus", [Hero("custom")])'},
    {"program": 'root = GlideCard("focus", [Hero("left")])\nother = evil()'},
    {"slot": "composer-ring", "program": 'root = GlideCard("focus", [Hero("left")])'},
])
def test_desktop_rejects_unsupported_mounts(patch):
    assert project({**MOUNT, "startedAt": 1000, **patch}) is None


def test_desktop_projects_ring_to_supported_banner():
    assert project({**MOUNT, "startedAt": 1000, "slot": "composer-ring"})["parts"] == ["Hero", "Meter"]

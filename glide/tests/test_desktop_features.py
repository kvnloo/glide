import importlib.util
from pathlib import Path
from shutil import copytree
from types import SimpleNamespace
import sys

import pytest

from glide_plugin.desktop.install import install
from glide_plugin import attention

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
from fastapi import FastAPI
from fastapi.testclient import TestClient


@pytest.mark.parametrize("nested", [False, True])
def test_desktop_companion_installed_routes_and_shared_state(tmp_path, monkeypatch, nested):
    home = tmp_path / "hermes"
    monkeypatch.setitem(sys.modules, "hermes_constants", SimpleNamespace(get_hermes_home=lambda: home))
    agent = tmp_path / "plugin"
    package = agent / "glide" if nested else agent
    copytree(Path(attention.__file__).parent, package, ignore=lambda _, names: {"__pycache__"} & set(names))
    (agent / "plugin.yaml").touch()
    install(agent, tmp_path / "desktop")
    assert "registerSettingsPage" in (tmp_path / "desktop/glide/plugin.js").read_text()
    spec = importlib.util.spec_from_file_location("glide_test_desktop_api", agent / "dashboard/plugin_api.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    app = FastAPI()
    app.include_router(module.router, prefix="/api/plugins/glide")
    client = TestClient(app)
    path = "/api/plugins/glide/desktop/features"

    assert client.get(path).json()["memory"] == {"on": False, "complete": False, "sessions": 0, "corrections": 0}
    assert client.post(path, json={"action": "sync"}).json()["scanned"] == 0
    assert client.post(path, json={"action": "enable"}).json()["memory"]["on"] is True
    assert client.post(path, json={"action": "disable"}).json()["memory"]["on"] is False
    assert client.post(path, json={"action": "recall", "query": "format"}).status_code == 409
    assert client.post(path, json={"action": "start", "minutes": 4}).status_code == 422
    assert client.post(path, json={"action": "start", "minutes": 25}).json()["focus"]["block"]["minutes"] == 25
    attention.route(home, "Held for the digest", posture=None)
    assert client.get(path).json()["focus"]["queued"] == 1
    stopped = client.post(path, json={"action": "stop"}).json()
    assert stopped["digest"][0]["title"] == "Held for the digest"
    assert stopped["focus"]["block"] is None
    assert client.post(path, json={"action": "sync", "home": "other"}).status_code == 422

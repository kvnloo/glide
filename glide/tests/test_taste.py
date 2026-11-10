"""The real HTTP board seam with an isolated local server, no personal data."""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from glide_plugin import core


@pytest.fixture
def atlas(monkeypatch):
    boards = [{"id": "sketch-ab12", "title": "Launch brainstorm", "updated": 2},
              {"id": "older-ab12", "title": "Older", "updated": 1}]
    requests = []

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            requests.append(self.path)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps(boards).encode())

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    monkeypatch.setenv("GLIDE_TASTE_URL", base)
    yield base, boards, requests
    server.shutdown()
    server.server_close()
    thread.join()


def test_json_taste_opens_latest_real_board_without_enabling_memory(atlas, tmp_path, monkeypatch):
    base, boards, requests = atlas
    monkeypatch.setattr(core, "_home", lambda: tmp_path)
    assert requests == []
    before = list(tmp_path.rglob("*"))
    result = json.loads(core.command("json taste {}", session_id="live"))
    assert result == {"url": f"{base}/s/sketch-ab12/", "title": "Launch brainstorm"}
    assert requests == ["/api/boards"]
    assert not core.enabled(tmp_path) and list(tmp_path.rglob("*")) == before
    boards.clear()
    assert json.loads(core.command("json taste {}", session_id="live"))["url"] == f"{base}/boards"


def test_text_frontend_gets_the_same_board_link(atlas, tmp_path, monkeypatch):
    base, _, _ = atlas
    monkeypatch.setattr(core, "_home", lambda: tmp_path)
    assert f"{base}/s/sketch-ab12/" in core.command("taste", session_id="live")


@pytest.mark.parametrize("url", ["https://example.com", "http://localhost.evil/", "file:///tmp/board",
                                  "http://user:secret@127.0.0.1:8789", "http://127.0.0.1:8789/?secret=x"])
def test_taste_refuses_nonlocal_or_credential_urls(url, monkeypatch, tmp_path):
    monkeypatch.setattr(core, "_home", lambda: tmp_path)
    monkeypatch.setenv("GLIDE_TASTE_URL", url)
    result = json.loads(core.command("json taste {}", session_id="live"))
    assert "error" in result and "loopback" in result["error"]


def test_unavailable_board_server_has_actionable_error(monkeypatch, tmp_path):
    monkeypatch.setattr(core, "_home", lambda: tmp_path)
    monkeypatch.setenv("GLIDE_TASTE_URL", "http://127.0.0.1:1")
    result = json.loads(core.command("json taste {}", session_id="live"))
    assert "board.mjs serve" in result["error"]


def test_invalid_board_data_is_an_error(atlas, tmp_path, monkeypatch):
    _, boards, _ = atlas
    boards[:] = [{"id": "../../private", "title": "Bad"}]
    monkeypatch.setattr(core, "_home", lambda: tmp_path)
    assert "error" in json.loads(core.command("json taste {}", session_id="live"))

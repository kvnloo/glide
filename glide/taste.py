"""Opt-in connection to the existing Taste Atlas board server. No server or data ownership."""

from __future__ import annotations

import json
import os
import re
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, build_opener


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def board() -> dict:
    raw = os.environ.get("GLIDE_TASTE_URL", "http://127.0.0.1:8789")
    parsed = urlsplit(raw)
    if (parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}
            or parsed.username or parsed.password or parsed.query or parsed.fragment
            or parsed.path not in {"", "/", "/boards"}):
        raise ValueError("GLIDE_TASTE_URL must be an HTTP loopback origin without credentials or query")
    base = f"http://{parsed.netloc}"
    try:
        opener = build_opener(ProxyHandler({}), _NoRedirect())
        with opener.open(f"{base}/api/boards", timeout=3) as response:
            boards = json.load(response)
    except (OSError, URLError, ValueError) as error:
        raise ValueError("Taste Atlas is unavailable. Run node scripts/board.mjs serve in "
                         "your Taste Atlas app, then /glide taste. Set GLIDE_TASTE_URL for another port.") from error
    if not isinstance(boards, list) or any(
        not isinstance(b, dict) or not isinstance(b.get("id"), str)
        or not re.fullmatch(r"[a-z0-9-]{4,40}", b["id"])
        or not isinstance(b.get("title"), str) for b in boards
    ):
        raise ValueError("Invalid Taste Atlas /api/boards response")
    # Atlas returns newest first, sharing the same order as its Boards view.
    return {"url": f"{base}/s/{boards[0]['id']}/", "title": boards[0]["title"]} if boards else {
        "url": f"{base}/boards", "title": "Taste brainstorm boards"}

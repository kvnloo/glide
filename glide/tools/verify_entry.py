#!/usr/bin/env python3
"""Check entry docs and, optionally, the served gallery in owned headless Chromium.

    python glide/tools/verify_entry.py
    uv run --with playwright python glide/tools/verify_entry.py \
        --gallery-url http://127.0.0.1:43210/all.html --artifacts /tmp/glide-entry-proof
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
MEDIA = (
    "glide-s4-ask.png", "glide-s4-router.png",
    "glide-s5-hillclimb.png", "glide-s6-savings.png",
)


def check_docs() -> dict:
    for filename in ("README.md", "FORK.md"):
        text = (ROOT / filename).read_text()
        intro = text.split("## Tern chat reference")[0] if filename == "README.md" else text.split("## What the fork adds")[0]
        for required in ("hermes plugins install kvnloo/glide", "≥0.23.0", "alt-glitch/hermes-tern",
                         "Detect", "Memory", "Skill router", "Hill climb", "Offload", "Taste",
                         "INCONCLUSIVE", "proof is pending"):
            assert required in intro, f"{filename}: missing {required}"
        assert not re.search(r"\b(submitted|winner|won)\b", intro, re.I), filename
    readme = (ROOT / "README.md").read_text()
    sizes = {}
    for name in MEDIA:
        path = ROOT / "glide/docs/media" / name
        assert f"glide/docs/media/{name}" in readme, f"Undocumented image: {name}"
        data = path.read_bytes()
        assert data[:8] == b"\x89PNG\r\n\x1a\n", f"Not PNG: {name}"
        width, height = int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
        assert 0 < width <= 1600 and 0 < height <= 1000, (name, width, height)
        assert len(data) < 250_000, f"Image too large: {name}"
        sizes[name] = {"bytes": len(data), "width": width, "height": height}
    return {"docs": "pass", "media": sizes}


def check_gallery(url: str, artifacts: Path) -> dict:
    from playwright.sync_api import sync_playwright

    origin = urlparse(url)
    assert origin.scheme == "http" and origin.hostname in {"127.0.0.1", "localhost", "::1"}
    artifacts.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True)
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 1800}, device_scale_factor=1)
            # The check must not visit linked external demos or use the owner's browser.
            page.route("**/*", lambda route: route.continue_() if
                       urlparse(route.request.url).netloc == origin.netloc else route.abort())
            response = page.goto(url, wait_until="networkidle")
            assert response and response.status == 200, "Gallery must return HTTP 200"
            page.locator("img").evaluate_all("imgs => imgs.forEach(i => i.loading = 'eager')")
            page.wait_for_function("Array.from(document.images).every(i => i.complete)")
            broken = page.locator("img").evaluate_all(
                "imgs => imgs.filter(i => !i.naturalWidth).map(i => i.src)")
            assert not broken, f"Broken images: {broken}"
            assert page.locator("video, source").count() == 0, "Unreviewed historical clips must stay out"
            body = page.inner_text("body")
            for required in ("a1b573e", "dc2b19a", "535e5fe", "native-pane proof pending",
                             "in progress, not submitted yet", "INCONCLUSIVE"):
                assert required in body, f"Gallery missing: {required}"
            for name in MEDIA:
                assert page.locator(f'img[src$="{name}"]').count() == 1, name
            for feature in ("Skill router install", "First hill climb: measured referee",
                            "Offload + estimated savings card", "One install: Tern UI + Glide"):
                row = page.locator(".f").filter(has=page.get_by_text(feature, exact=True))
                assert row.count() == 1 and "ok" in row.get_attribute("class").split(), feature
            taste = page.locator(".f").filter(has=page.get_by_text("Taste pane (/glide taste)", exact=True))
            assert "wip" in taste.get_attribute("class").split(), "Taste proof must remain pending"
            page.get_by_role("heading", name="glide: the hackathon entry", exact=False).evaluate(
                "el => el.scrollIntoView({block: 'start'})")
            screenshot = artifacts / "gallery-entry.png"
            page.screenshot(path=str(screenshot))
            desktop_overflow = page.evaluate("document.documentElement.scrollWidth > innerWidth")
            assert not desktop_overflow, "Desktop gallery overflows"
            images = page.locator("img").count()
            page.set_viewport_size({"width": 390, "height": 844})
            assert not page.evaluate("document.documentElement.scrollWidth > innerWidth"), "Mobile gallery overflows"
            return {"gallery": "pass", "http_status": response.status, "images": images,
                    "broken_images": broken, "video_elements": 0,
                    "desktop_and_mobile_overflow": False, "screenshot": str(screenshot)}
        finally:
            browser.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gallery-url")
    parser.add_argument("--artifacts", type=Path, default=Path("/tmp/glide-entry-proof"))
    args = parser.parse_args()
    result = check_docs()
    if args.gallery_url:
        result.update(check_gallery(args.gallery_url, args.artifacts))
        (args.artifacts / "verification.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

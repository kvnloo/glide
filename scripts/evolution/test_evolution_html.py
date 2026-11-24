#!/usr/bin/env python3
"""Exercise the generated archive as a standalone offline file in Chromium."""
import argparse
import os
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "docs/evolution/glide-evolution.html"


def verify(archive, screenshot, chromium):
    size = archive.stat().st_size
    assert 0 < size < 25_000_000, f"Unexpected archive size: {size}"
    with TemporaryDirectory() as directory, sync_playwright() as playwright:
        standalone = Path(directory) / archive.name
        shutil.copyfile(archive, standalone)
        url = standalone.as_uri()
        browser = playwright.chromium.launch(executable_path=chromium)
        try:
            context = browser.new_context(
                viewport={"width": 1280, "height": 900},
                device_scale_factor=1, offline=True, service_workers="block"
            )
            requests, routed, errors = [], [], []

            def block(route):
                if route.request.url == url and route.request.is_navigation_request():
                    route.continue_()
                else:
                    routed.append(route.request.url)
                    route.abort()

            context.route("**/*", block)

            def record(request):
                if not (request.url == url and request.is_navigation_request()
                        or request.url.startswith("data:")):
                    requests.append(request.url)

            context.on("request", record)
            page = context.new_page()
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: errors.append(str(exc)))
            page.goto(url, wait_until="load")
            assert page.locator("h1").inner_text() == "Glide."
            eras = page.locator("section.era").count()
            images = page.locator(".gallery img")
            captures = images.count()
            assert eras > 0 and captures > 0, "Archive content missing"
            assert images.evaluate_all(
                "images => images.every(i => i.src.startsWith('data:image/') && "
                "i.complete && i.naturalWidth > 0)"
            ), "Capture failed to load offline"
            assert page.locator("script[src], link[href], iframe, object, embed").count() == 0

            assert page.locator("nav a").count() == eras
            hrefs = page.locator("a[href]").evaluate_all("links => links.map(a => a.getAttribute('href'))")
            assert all(href.startswith("#") for href in hrefs), "Non-local hyperlink"
            ledger_summaries = page.get_by_text("Commit ledger", exact=False)
            assert ledger_summaries.count() == eras
            ledger_total = sum(summary.locator("..").locator("li").count()
                               for summary in ledger_summaries.all())
            cover_total = int(page.locator(".stats dd").first.inner_text().replace(",", ""))
            assert ledger_total == cover_total, "Commit ledger does not match archive total"

            # Exercise the offline anchor and the full, collapsed-by-default history.
            page.locator("nav a").last.click()
            assert page.url.endswith(f"#era-{eras}")
            ledger = page.locator(".era").last.get_by_text("Commit ledger", exact=False)
            ledger.click()
            assert ledger.locator("..").evaluate("details => details.open")
            ledger.click()
            page.evaluate("history.replaceState(null, '', location.pathname); scrollTo(0, 0)")
            if screenshot:
                screenshot.parent.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=screenshot, full_page=True)

            assert not requests and not routed, f"Unexpected requests: {requests + routed}"
            assert not errors, f"Browser errors: {errors}"
            print(f"PASS: {eras} eras; {ledger_total} commits; {captures} decoded captures; "
                  f"{len(requests)} external requests; {len(routed)} blocked routes; "
                  f"{len(errors)} browser errors; {size} bytes")
        finally:
            browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, default=ARCHIVE)
    parser.add_argument("--screenshot", type=Path)
    parser.add_argument("--chromium", default=os.environ.get("CHROMIUM_PATH"),
                        help="Optional system Chromium/Chrome executable")
    args = parser.parse_args()
    verify(args.archive, args.screenshot, args.chromium)

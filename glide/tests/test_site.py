"""The landing page (glide/site): its tokens stay generated, its stylesheet passes the cards' drift rules,
every reference resolves, the demo only shows commands Glide has, and the demo model's own tests pass."""

from __future__ import annotations

import importlib.util
import re
import shutil
import subprocess
from pathlib import Path

import pytest

GLIDE = Path(__file__).resolve().parents[1]
SITE = GLIDE / "site"
REPO = GLIDE.parent
TOKENS = GLIDE / "frontend" / "tokens.ts"


def _site_tokens():
    spec = importlib.util.spec_from_file_location("site_tokens", GLIDE / "tools" / "site_tokens.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _token_values() -> tuple[set[str], set[str], set[str]]:
    groups = _site_tokens().parse(TOKENS.read_text())
    radii = {f"{v}px" for v in groups["RADIUS"].values()} | {"50%", "0"}
    sizes = {f"{v}px" for v in groups["TYPE"].values()}
    return radii, sizes, set(groups["TRACK"].values())


def test_tokens_css_is_generated_from_tokens_ts():
    want = _site_tokens().render(TOKENS.read_text())
    assert (SITE / "tokens.css").read_text() == want, "run python glide/tools/site_tokens.py"
    assert "--dash-gold: #d7b986;" in want and "--t-body: 13px;" in want and "--r-tile: 8px;" in want


def test_stylesheet_uses_only_tokens():
    """The same rules as frontend/src/__tests__/helpers/tokenDrift.ts, applied to the page's stylesheet."""
    css = (SITE / "style.css").read_text()
    radii, sizes, tracking = _token_values()
    literal = re.compile(r"^-?[\d.]+(px|em)$|^\d+%$")

    def values(prop: str) -> list[str]:
        return [v.strip() for v in re.findall(prop, css) if literal.match(v.strip())]

    drift = {
        "radii": [v for v in values(r"border-radius:\s*([^;'\"`}]+?)\s*[;'\"`}]") if v not in radii],
        "sizes": [v for v in values(r"font-size:\s*([^;'\"`}]+?)\s*[;'\"`}]") + re.findall(r"font:\s*(?:\d{3}\s+)?([\d.]+px)", css) if v not in sizes],
        "tracking": [v for v in values(r"letter-spacing:\s*([^;'\"`}]+?)\s*[;'\"`}]") if v not in tracking],
        "hexes": [h for h in re.findall(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b", css) if not re.fullmatch(r"#0{3}(0{3})?", h)],
    }
    assert drift == {"radii": [], "sizes": [], "tracking": [], "hexes": []}
    used = set(re.findall(r"var\(--([\w-]+)\)", css))
    defined = set(re.findall(r"--([\w-]+):", (SITE / "tokens.css").read_text() + css + (SITE / "app.js").read_text()))
    assert used <= defined, f"undefined variables: {sorted(used - defined)}"


def test_every_local_reference_and_hook_resolves():
    html = (SITE / "index.html").read_text()
    local = [r for r in re.findall(r'(?:href|src)="([^"#][^"]*)"', html) if not re.match(r"^(https?:|data:|mailto:)", r)]
    assert set(local) >= {"tokens.css", "style.css", "app.js"}
    for ref in local:
        assert (SITE / ref).is_file(), ref
    imports = re.findall(r"from '\./([\w.-]+)'", (SITE / "app.js").read_text())
    assert imports == ["model.js"] and all((SITE / i).is_file() for i in imports)
    app = (SITE / "app.js").read_text()
    drawn = set(re.findall(r"'(data-[\w-]+)':", app)) | {f"data-{k}" for k in re.findall(r"\.dataset\.(\w+) =", app)}
    for hook in set(re.findall(r"\[(data-[\w-]+)[\]=]", app)) - drawn:
        assert hook in html, f"app.js looks for [{hook}] but index.html has none"
    for anchor in re.findall(r'href="#([\w-]+)"', html):
        assert f'id="{anchor}"' in html, anchor


def test_page_loads_nothing_but_itself_fonts_and_repo_captures():
    html = (SITE / "index.html").read_text()
    remote = set(re.findall(r'<(?:script|link|img)[^>]+(?:href|src)="(https?://[^/"]+)', html))
    assert remote <= {"https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://raw.githubusercontent.com"}
    for capture in re.findall(r'src="https://raw\.githubusercontent\.com/kvnloo/glide/main/([^"]+)"', html):
        assert (REPO / capture).is_file(), capture
    js = (SITE / "app.js").read_text() + (SITE / "model.js").read_text()
    assert not re.search(r"\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon", js), "the demo must not reach the network"


def test_demo_only_shows_commands_glide_has():
    readme = (REPO / "README.md").read_text()
    model = (SITE / "model.js").read_text()
    suggestions = re.search(r"export const SUGGESTIONS = \[(.*?)\]", model).group(1)
    for command in re.findall(r"'(/[^']+)'", suggestions):
        if command == "/help":
            continue
        documented = re.sub(r"^(/glide recall) .*", r"\1", command)
        assert documented in readme, f"{command}: not a documented Glide command"
    themes = re.findall(r"\{ id: '(\w+)', label:", re.search(r"export const THEMES = \[(.*?)\n\]", model, re.S).group(1))
    theme_modes = re.search(r"export type ThemeMode = (.*)", (REPO / "frontend" / "src" / "settings.ts").read_text()).group(1)
    # The landing page demonstrates the original core picker; it does not simulate
    # whole-app template side effects or the additional paired themes.
    assert set(themes) == {"auto", "dash", "nous", "skin", "tern"}
    assert set(themes) <= set(re.findall(r"'(\w+)'", theme_modes)), "every demo theme must exist in Glide"
    seed = (GLIDE / "demo" / "seed.py").read_text()
    for text in re.findall(r"text: '([^']+)'", model.split("export const SESSIONS_READ")[0]):
        assert text in seed, f"demo correction is not in demo/seed.py: {text}"


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
def test_demo_model():
    run = subprocess.run(["node", "--test", str(SITE / "model.test.mjs")], capture_output=True, text=True, timeout=60)
    assert run.returncode == 0, run.stdout + run.stderr
    assert re.search(r"^ℹ fail 0$", run.stdout, re.M), run.stdout

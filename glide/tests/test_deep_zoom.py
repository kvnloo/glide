"""Deep zoom (GL-104): glide_deep_zoom_open and `/glide zoom` check a Deep Zoom Image pyramid (or tile an image
once with libvips), then put the shipped viewer in the Pages list with the pyramid as its `tiles`."""

from __future__ import annotations

import json
import os
import stat
import sys
import threading
import time
from types import SimpleNamespace

import pytest

from glide_plugin import core, deep_zoom, ui

GIGA = (40000, 30000)


def _home(tmp_path):
    return tmp_path / "hermes"


def _pyramid(folder, name="scene", width=GIGA[0], height=GIGA[1], tile=510, overlap=1, fmt="png"):
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{name}_files" / "0").mkdir(parents=True)
    dzi = folder / f"{name}.dzi"
    dzi.write_text(f'<?xml version="1.0" encoding="UTF-8"?><Image xmlns="http://schemas.microsoft.com/deepzoom/2008" '
                   f'TileSize="{tile}" Overlap="{overlap}" Format="{fmt}"><Size Width="{width}" Height="{height}"/></Image>')
    return dzi


def _pane(home, pages):
    stop = threading.Event()

    def run():
        seen = 0
        while not stop.is_set():
            data = ui._read(ui.settings_file(home)).get("ui") or {}
            if data.get("rev", 0) > seen:
                seen = data["rev"]
                ids = [p["id"] for p in data.get("pages", [])]
                ui.status_file(home).write_text(json.dumps({"rev": seen, "widgets": {}, "pages": pages(ids)}))
            time.sleep(0.02)

    threading.Thread(target=run, daemon=True).start()
    return stop


def test_read_dzi_reports_a_gigapixel_pyramid(tmp_path):
    info = deep_zoom.read_dzi(_pyramid(tmp_path))
    assert info == {"width": 40000, "height": 30000, "tile": 510, "overlap": 1, "format": "png", "levels": 17,
                    "pixels": 1_200_000_000}


@pytest.mark.parametrize("body, problem", [
    ("not xml", "not Deep Zoom XML"),
    ("<Collection/>", "not a Deep Zoom Image"),
    ('<Image TileSize="256" Format="gif"><Size Width="9" Height="9"/></Image>', "tile format gif"),
    ('<Image TileSize="x" Format="jpg"><Size Width="9" Height="9"/></Image>', "must be integers"),
    ('<Image TileSize="256" Format="jpg"/>', "must be integers"),
    ('<Image TileSize="99999" Format="jpg"><Size Width="9" Height="9"/></Image>', "out of range"),
])
def test_read_dzi_refuses_what_is_not_a_pyramid(tmp_path, body, problem):
    dzi = _pyramid(tmp_path)
    dzi.write_text(body)
    with pytest.raises(deep_zoom.DziError, match=problem):
        deep_zoom.read_dzi(dzi)


def test_read_dzi_needs_the_tile_folder_and_a_small_descriptor(tmp_path):
    dzi = _pyramid(tmp_path)
    (tmp_path / "scene_files" / "0").rmdir()
    (tmp_path / "scene_files").rmdir()
    with pytest.raises(deep_zoom.DziError, match="no scene_files folder"):
        deep_zoom.read_dzi(dzi)
    dzi.write_text("<Image>" + " " * (70 << 10) + "</Image>")
    with pytest.raises(deep_zoom.DziError, match="over 64 KiB"):
        deep_zoom.read_dzi(dzi)


def test_open_puts_the_viewer_in_the_pages_list_and_reports_the_panes_verdict(tmp_path):
    home, dzi = _home(tmp_path), _pyramid(tmp_path / "art")
    stop = _pane(home, lambda ids: {i: {"ok": True, "block": 9} for i in ids})
    try:
        out = deep_zoom.open_deep_zoom(home, {"path": str(dzi), "how": "beside"}, wait=2, now=3)
    finally:
        stop.set()
    assert out == {"ok": True, "page": "deep-zoom", "opened": True, "how": "beside", "width": 40000, "height": 30000,
                   "levels": 17, "size": "1.20 gigapixels"}
    assert ui.state(home)["pages"] == [{"id": "deep-zoom", "title": "scene", "path": str(deep_zoom.VIEWER),
                                        "how": "beside", "tiles": str(dzi.resolve()), "opened": 3000}]
    assert deep_zoom.VIEWER.is_file() and deep_zoom.VIEWER.stat().st_size <= ui.PAGE_MAX_BYTES


def test_open_without_a_pane_saves_it_and_a_pane_failure_is_reported(tmp_path):
    home, dzi = _home(tmp_path), _pyramid(tmp_path)
    out = deep_zoom.open_deep_zoom(home, {"path": str(dzi), "id": "survey", "title": "Survey"}, wait=0)
    assert out["ok"] is True and out["opened"] is False and out["size"] == "1.20 gigapixels"
    stop = _pane(home, lambda ids: {i: {"ok": False, "problems": ["not inside a Tern pane"]} for i in ids})
    try:
        out = deep_zoom.open_deep_zoom(home, {"path": str(dzi), "id": "survey"}, wait=2)
    finally:
        stop.set()
    assert out["ok"] is False and out["problems"] == ["not inside a Tern pane"]
    assert [p["id"] for p in ui.state(home)["pages"]] == ["survey"]


@pytest.mark.parametrize("args, problem", [
    ({"path": "scene.dzi"}, "absolute path"),
    ({"path": "/nope/scene.dzi"}, "no file at"),
    ({"path": "{dir}/notes.txt"}, "a .dzi pyramid or an image"),
    ({"path": "{dir}/scene.dzi", "id": "Bad Id"}, "id:"),
    ({"path": "{dir}/scene.dzi", "how": "sideways"}, "how:"),
])
def test_open_refuses_bad_arguments(tmp_path, args, problem):
    _pyramid(tmp_path)
    (tmp_path / "notes.txt").write_text("x")
    args = {k: v.format(dir=tmp_path) for k, v in args.items()}
    out = deep_zoom.open_deep_zoom(_home(tmp_path), args, wait=0)
    assert out["ok"] is False and problem in out["error"]
    assert "pages" not in ui.state(_home(tmp_path))


def test_an_image_needs_libvips(tmp_path, monkeypatch):
    monkeypatch.setenv("PATH", str(tmp_path / "empty-bin"))
    (tmp_path / "big.tif").write_bytes(b"II*\0")
    out = deep_zoom.open_deep_zoom(_home(tmp_path), {"path": str(tmp_path / "big.tif")}, wait=0)
    assert out["ok"] is False and "libvips" in out["error"]


def test_an_image_is_tiled_once_with_vips_dzsave_and_cached(tmp_path, monkeypatch):
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    calls = tmp_path / "calls.txt"
    vips = bin_dir / "vips"
    # A stand-in for libvips' CLI: writes the pyramid dzsave would, and logs its arguments.
    vips.write_text("#!/bin/sh\n"
                    f'echo "$@" >> "{calls}"\n'
                    'mkdir -p "$3_files/0"\n'
                    "printf '<Image TileSize=\"254\" Overlap=\"1\" Format=\"jpg\"><Size Width=\"50000\" Height=\"40000\"/></Image>' "
                    '> "$3.dzi"\n')
    vips.chmod(vips.stat().st_mode | stat.S_IXUSR)
    monkeypatch.setenv("PATH", f"{bin_dir}{os.pathsep}{os.environ.get('PATH', '')}")
    home, source = _home(tmp_path), tmp_path / "survey.tif"
    source.write_bytes(b"II*\0")
    first = deep_zoom.open_deep_zoom(home, {"path": str(source)}, wait=0)
    again = deep_zoom.open_deep_zoom(home, {"path": str(source)}, wait=0)
    assert first["ok"] and again["ok"] and first["size"] == "2.00 gigapixels" and first["levels"] == 17
    args = calls.read_text().splitlines()
    assert len(args) == 1 and args[0].startswith(f"dzsave {source} ") and "--tile-size 254 --overlap 1" in args[0]
    tiles = ui.state(home)["pages"][0]["tiles"]
    assert tiles.startswith(str(deep_zoom.cache_dir(home))) and tiles.endswith("/image.dzi")
    assert not list(deep_zoom.cache_dir(home).glob("*.part"))


def test_a_failed_dzsave_leaves_no_cache(tmp_path, monkeypatch):
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    vips = bin_dir / "vips"
    vips.write_text("#!/bin/sh\necho 'VipsForeignLoad: not a known file format' >&2\nexit 1\n")
    vips.chmod(vips.stat().st_mode | stat.S_IXUSR)
    monkeypatch.setenv("PATH", str(bin_dir))
    (tmp_path / "x.png").write_bytes(b"\x89PNG")
    out = deep_zoom.open_deep_zoom(_home(tmp_path), {"path": str(tmp_path / "x.png")}, wait=0)
    assert out == {"ok": False, "error": "vips dzsave failed: VipsForeignLoad: not a known file format"}
    assert not any(deep_zoom.cache_dir(_home(tmp_path)).iterdir())


def test_glide_zoom_command(tmp_path, monkeypatch):
    home, dzi = _home(tmp_path), _pyramid(tmp_path / "my art")
    monkeypatch.setitem(sys.modules, "hermes_constants", SimpleNamespace(get_hermes_home=lambda: home))
    monkeypatch.setattr(ui, "WAIT_S", 0)
    monkeypatch.setattr(deep_zoom.open_deep_zoom, "__kwdefaults__", {"wait": 0, "now": None})
    assert deep_zoom.command("").startswith("Usage: /glide zoom")
    assert core.command(f'zoom "{dzi}" below') == "40000×30000 (1.20 gigapixels, 17 levels) is in the Pages list; it opens when a Glide pane answers."
    assert ui.state(home)["pages"][0]["how"] == "below"
    assert core.command("zoom /nope.dzi").startswith("Deep zoom did not open: path: no file at")
    assert "/glide zoom <path>" in core.USAGE


def test_viewer_is_self_contained_and_reads_only_its_own_origin():
    text = deep_zoom.VIEWER.read_text()
    assert "fetch('image.dzi'" in text and "image_files/" in text
    assert "://" not in text.replace("http://schemas.microsoft.com", "")

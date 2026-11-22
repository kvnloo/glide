"""Deep zoom (GL-104): a gigapixel image opened in the Glide pane as a tile pyramid, never decoded whole.

``glide_deep_zoom_open`` and ``/glide zoom <path>`` take a Deep Zoom Image (a ``.dzi`` descriptor beside its
``<name>_files/<level>/<col>_<row>.<format>`` tiles), or any image libvips reads, which is cut into one once
with ``vips dzsave`` (cached under ``<home>/glide/deepzoom``). The page is the shipped viewer
(``glide/deepzoom/viewer.html``) with a ``tiles`` key: the pane serves the descriptor and the tiles inside the
pyramid's own bounds from a private loopback origin (``glide/frontend/deepZoom.ts``) and nothing else, so the
viewer loads only the tiles in view at the level it shows.
"""

from __future__ import annotations

import hashlib
import math
import re
import shutil
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from . import ui

VIEWER = Path(__file__).resolve().parent / "deepzoom" / "viewer.html"
FORMATS = ("jpg", "jpeg", "png", "webp")
# Images `vips dzsave` cuts into a pyramid on first open.
SOURCE_EXTS = frozenset(".tif .tiff .jpg .jpeg .png .webp .jp2 .psb .svs .ndpi .scn .mrxs .vips .exr .hdr".split())
DZI_MAX_BYTES = 64 << 10
MAX_SIDE = 1 << 22  # 4 Mpx a side: 16 terapixels, far past any real pyramid.
DZSAVE_TIMEOUT_S = 3600
NS = "{http://schemas.microsoft.com/deepzoom/2008}"

SCHEMA = {
    "name": "glide_deep_zoom_open",
    "description": (
        "Open a very large image (gigapixel scans, panoramas, maps, slides) in the Glide pane's deep-zoom viewer: "
        "smooth zoom and pan that loads only the tiles in view, so the whole image is never decoded. path: an "
        "absolute path to a Deep Zoom Image (.dzi, with its <name>_files folder beside it), or to an image file "
        "(TIFF, JPEG, PNG, WebP, JPEG 2000, slide formats), which is tiled once with libvips (`vips dzsave`) and "
        "cached. how: over (default) covers the chat until closed; beside or below docks it. The result says "
        "whether the pane opened it."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Absolute path of the .dzi descriptor or the source image."},
            "title": {"type": "string", "description": "Name shown in the Pages list; defaults to the file name."},
            "id": {"type": "string", "description": "Page id (lowercase, digits, dashes); defaults to deep-zoom."},
            "how": {"type": "string", "enum": list(ui.PAGE_HOWS)},
        },
        "required": ["path"],
        "additionalProperties": False,
    },
}


class DziError(ValueError):
    pass


def read_dzi(path: Path) -> dict[str, Any]:
    """The descriptor's image size, tile size, overlap, format and levels; DziError when it is not a pyramid."""
    try:
        if path.stat().st_size > DZI_MAX_BYTES:
            raise DziError("the .dzi descriptor is over 64 KiB")
        root = ET.fromstring(path.read_bytes())
    except OSError as exc:
        raise DziError(f"cannot read {path.name}") from exc
    except ET.ParseError as exc:
        raise DziError(f"{path.name} is not Deep Zoom XML") from exc
    if root.tag not in (f"{NS}Image", "Image"):
        raise DziError(f"{path.name} is not a Deep Zoom Image descriptor")
    size = root.find(f"{NS}Size")
    size = size if size is not None else root.find("Size")
    try:
        tile, overlap = int(root.get("TileSize", "")), int(root.get("Overlap", "0"))
        width, height = int(size.get("Width", "")), int(size.get("Height", ""))  # type: ignore[union-attr]
    except (AttributeError, ValueError) as exc:
        raise DziError(f"{path.name}: TileSize, Width and Height must be integers") from exc
    fmt = (root.get("Format") or "").lower()
    if fmt not in FORMATS:
        raise DziError(f"{path.name}: tile format {fmt or '(none)'} is not one of {', '.join(FORMATS)}")
    if not (1 <= tile <= 4096 and 0 <= overlap <= 64 and 1 <= width <= MAX_SIDE and 1 <= height <= MAX_SIDE):
        raise DziError(f"{path.name}: sizes out of range")
    tiles = path.with_name(path.stem + "_files")
    if not tiles.is_dir():
        raise DziError(f"no {tiles.name} folder beside {path.name}")
    levels = math.ceil(math.log2(max(width, height))) + 1
    return {"width": width, "height": height, "tile": tile, "overlap": overlap, "format": fmt, "levels": levels,
            "pixels": width * height}


def cache_dir(home: Path) -> Path:
    return home / "glide" / "deepzoom"


def tile_image(home: Path, source: Path) -> Path:
    """The cached pyramid of ``source`` (cut with ``vips dzsave`` the first time); DziError without libvips."""
    stat = source.stat()
    key = hashlib.sha256(f"{source}\0{stat.st_size}\0{stat.st_mtime_ns}".encode()).hexdigest()[:24]
    out = cache_dir(home) / key
    dzi = out / "image.dzi"
    if dzi.is_file():
        return dzi
    vips = shutil.which("vips")
    if not vips:
        raise DziError("tiling an image needs libvips (`brew install vips` or `apt install libvips-tools`); "
                       "or pass a .dzi pyramid")
    work = out.with_name(key + ".part")
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)
    try:
        # 254 + 1 px overlap a side gives 256 px tiles, the layout viewers expect; JPEG at q85 keeps them small.
        run = subprocess.run([vips, "dzsave", str(source), str(work / "image"), "--tile-size", "254",
                              "--overlap", "1", "--suffix", ".jpg[Q=85]"],
                             capture_output=True, text=True, timeout=DZSAVE_TIMEOUT_S, check=False)
        if run.returncode != 0 or not (work / "image.dzi").is_file():
            tail = (run.stderr or run.stdout).strip().splitlines()[-1:] or ["no pyramid written"]
            raise DziError(f"vips dzsave failed: {tail[0][:200]}")
        shutil.rmtree(out, ignore_errors=True)
        work.rename(out)
    except subprocess.TimeoutExpired as exc:
        raise DziError("vips dzsave took over an hour") from exc
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return dzi


def _megapixels(info: dict[str, Any]) -> str:
    gp = info["pixels"] / 1e9
    return f"{gp:.2f} gigapixels" if gp >= 1 else f"{info['pixels'] / 1e6:.1f} megapixels"


def open_deep_zoom(home: Path, args: dict[str, Any], *, wait: float = ui.WAIT_S, now: float | None = None) -> dict[str, Any]:
    raw, how = args.get("path"), args.get("how", "over")
    pid = args.get("id") or "deep-zoom"
    if not isinstance(pid, str) or not ui._ID.match(pid):
        return {"ok": False, "error": "id: use 1-40 lowercase letters, digits or dashes"}
    if how not in ui.PAGE_HOWS:
        return {"ok": False, "error": f"how: one of {', '.join(ui.PAGE_HOWS)}"}
    file = Path(raw) if isinstance(raw, str) and raw else None
    if file is None or not file.is_absolute():
        return {"ok": False, "error": "path: an absolute path to a .dzi pyramid or an image"}
    try:
        file = file.resolve(strict=True)
        if not file.is_file():
            raise OSError
    except (OSError, RuntimeError):
        return {"ok": False, "error": f"path: no file at {file}"}
    try:
        if file.suffix.lower() == ".dzi":
            dzi = file
        elif file.suffix.lower() in SOURCE_EXTS:
            dzi = tile_image(home, file)
        else:
            return {"ok": False, "error": "path: a .dzi pyramid or an image (TIFF, JPEG, PNG, WebP, JPEG 2000, slides)"}
        info = read_dzi(dzi)
    except DziError as exc:
        return {"ok": False, "error": str(exc)}
    if not VIEWER.is_file():
        return {"ok": False, "error": "this Glide has no deep-zoom viewer (glide/deepzoom/viewer.html)"}
    title = args.get("title")
    title = title.strip()[:60] if isinstance(title, str) and title.strip() else file.stem[:60]
    page = {"id": pid, "title": title, "path": str(VIEWER), "how": how, "tiles": str(dzi),
            "opened": int((now if now is not None else time.time()) * 1000)}
    out = ui.save_page(home, page, wait)
    size = {"width": info["width"], "height": info["height"], "levels": info["levels"], "size": _megapixels(info)}
    return {**out, **size}


def command(rest: str) -> str:
    """`/glide zoom <path> [over|beside|below]`."""
    words = rest.strip().rsplit(" ", 1)
    how = "over"
    if len(words) == 2 and words[1].lower() in ui.PAGE_HOWS:
        how, path = words[1].lower(), words[0].strip()
    else:
        path = rest.strip()
    path = re.sub(r"^(['\"])(.*)\1$", r"\2", path)
    if not path:
        return "Usage: /glide zoom <path to a .dzi pyramid or a large image> [over|beside|below]"
    out = open_deep_zoom(ui._home(), {"path": str(Path(path).expanduser()), "how": how})
    if not out.get("ok"):
        return f"Deep zoom did not open: {out.get('error') or '; '.join(out.get('problems', []))}"
    what = f"{out['width']}×{out['height']} ({out['size']}, {out['levels']} levels)"
    return f"Opened {what} in deep zoom." if out.get("opened") else f"{what} is in the Pages list; it opens when a Glide pane answers."


def register(ctx) -> None:
    ctx.register_tool(name=SCHEMA["name"], toolset=ui.TOOLSET, schema=SCHEMA, handler=ui._tool(open_deep_zoom),
                      description=SCHEMA["description"], emoji="🔎")

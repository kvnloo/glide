# Deep zoom: gigapixel images in a pane

`/glide zoom <path> [over|beside|below]`, or the agent's `glide_deep_zoom_open` tool, opens a very large
image (a gigapixel scan, a panorama, a map, a slide) in Glide's deep-zoom viewer. Scroll, pinch or
double-click to zoom; drag or use the arrow keys to pan; **Fit** (or `0`) shows the whole image again.
The viewer loads only the tiles in view at the level the zoom needs. It draws the coarser tiles it
already has underneath while the finer ones arrive, so the image never goes blank. The whole image is
never decoded.

## What it opens

- A **Deep Zoom Image** (`.dzi`): the XML descriptor with its `<name>_files/<level>/<col>_<row>.<format>`
  tiles beside it (JPEG, PNG or WebP). `vips dzsave`, OpenSeadragon's tools and most slide scanners
  write this layout.
- **Any image libvips reads** (TIFF, JPEG, PNG, WebP, JPEG 2000, slide formats). The first open cuts it into a
  pyramid with `vips dzsave` (254 px tiles, 1 px overlap, JPEG q85) under `<hermes home>/glide/deepzoom/`.
  Later opens reuse the cached pyramid until the file changes. This needs libvips: `brew install vips`
  or `apt install libvips-tools`. Without it, the tool says so and you can pass a `.dzi` instead.

## How it is served

The page is `glide/deepzoom/viewer.html`, original code with no third-party library. Its `tiles` key names
the pyramid. The pane serves it from a private `127.0.0.1` origin under a random path prefix
(`glide/frontend/deepZoom.ts`). Only three things answer: the viewer, the descriptor and tiles inside the
pyramid's bounds. Everything else gets a 404: the source image, other files, tiles past a level's grid,
symlinks out of the folder, other `Host` headers and methods other than GET and HEAD. Like any bundled page,
the Tern browser must run on the same machine as the Glide frontend.

The viewer keeps up to 384 decoded tiles and fetches six at a time, the tiles nearest the middle first.
It follows the pane's theme through the `--glide-*` variables and turns off its zoom animation under
`prefers-reduced-motion`.

## Checks

- `glide/tests/test_deep_zoom.py`: descriptor checks, the Pages entry, tiling through `vips dzsave`,
  and `/glide zoom`.
- `frontend/src/__tests__/deepZoom.test.ts`: the tile origin serves what it should and refuses the
  rest, and a `tiles` page opens through it.
- `frontend/src/__tests__/deepZoomJourney.test.ts`: real headless Chrome on a 40000×30000 (1.2 gigapixel)
  synthetic pyramid written by `glide/tools/deepZoomPyramid.ts`. It zooms three levels with the
  wheel and pans with a drag. It checks that every request is the viewer, the descriptor or a tile, that
  every tile answers 200, and that no decoded image is larger than a tile. Run it with
  `CHROME=<binary>`; with no Chrome on PATH it is skipped. `GLIDE_DEEP_ZOOM_OUT=<dir>` keeps its
  screenshots and network log.

Try it by hand: `bun glide/tools/deepZoomPyramid.ts /tmp/giga`, then `/glide zoom /tmp/giga/image.dzi`.

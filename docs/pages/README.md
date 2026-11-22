# Glide can be a pixel-art editor

[Pixel Studio](pixel-art.html) is a self-contained, theme-aware Glide Page with a
16×16 canvas, custom ink, an eraser, and transparent PNG export.

From a Glide chat inside Tern, ask the agent to copy `docs/pages/pixel-art.html`
from this checkout into the session folder and call `glide_page_open` with:

| Argument | Value |
| --- | --- |
| `id` | `pixel-art` |
| `title` | `Pixel Studio` |
| `path` | The absolute path of the copied HTML file |
| `how` | `over` |

Drag to paint, or focus the canvas, move with the arrows and paint with Space.
**Save** stores one editable sprite in the browser's local storage. Reopen the
same file in the same browser storage profile to restore it. **Export PNG**
downloads the image at its original resolution, without the editing grid.

For a browser smoke test with a locally installed `playwright-core` and Chromium:

```sh
node frontend/e2e/pixel-art.mjs /path/to/playwright-core /path/to/chromium
```

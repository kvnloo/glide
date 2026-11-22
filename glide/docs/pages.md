# Pages with companions

`glide_page_open` takes an absolute HTML entry path and optionally an `assets`
array. List each file relative to the entry's folder and use the same relative
reference in the HTML, JS, CSS, or model. For example, list both a `.gltf` and
its `.bin` and texture files if the model references them. Audio can use regular
`<audio controls>`; if the host blocks autoplay, press Play.

The HTML cap is 4 MiB. Up to 64 declared companions may total 128 MiB. Asset
bundles use a per-page, local-only HTTP origin (so modules, model fetches, and audio
seeking work). Only the entry and declared companions are served. Absolute
paths, parent traversal, symlinks, and serving the whole folder are not supported.
The Tern browser must be on the same machine as the Glide frontend for bundled
Pages. Self-contained HTML still uses its original file URL.

Use the `--glide-*` variables in CSS and listen for `glide-theme` for Canvas or
WebGL. Dash and wallpaper modes use Glide's current palette; if Tern does not
export its surface colors, the page uses Glide's gold fallback. Close the page
to show chat again, then use **/sidebar → Pages → Open** to reopen it.

## Smoke fixture

From the repository root, run `python3 glide/tools/make_page_fixture.py "$(mktemp -d)/gold-scene"`.
In local Hermes × Tern, ask the agent to call `glide_page_open` with the printed
JSON. The rotating OBJ should draw in gold and the WAV should play when clicked.
Close the block and check that **Gold scene** stays in **/sidebar → Pages**;
select **Open** and check that the model and audio load again. Check the Tern
address bar separately: these pages still use Tern's native browser block, whose
public automation API does not offer a chrome-less presentation option.

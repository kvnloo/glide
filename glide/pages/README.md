# Pages that ship with Glide

Each `.html` file here is a whole app in one self-contained file, opened in the Glide pane like any page an
agent writes (`glide_page_open`, kvnloo/glide#326): `/glide ui open` lists them and `/glide ui open <id>
[over|beside|below]` opens one. The file's stem is its id and its `<title>` its name in the Pages list.

Rules every page here keeps (`glide/tests/test_ui.py` checks the first three):

- Self-contained: no network, no CDN, no external files. A page runs from a `file://` URL.
- Themed by the pane: colors come from the `--glide-*` CSS variables, and canvas colors follow the
  `glide-theme` window event, so `glide_ui_style` and the wallpaper restyle it live.
- At most 4 MiB.
- License-clean: sound is synthesized in the page (WebAudio, or samples computed in JavaScript), and any
  melody is an original or a public-domain composition. Each page names its sources in its header comment.

`/glide ui open character-poser over` opens the ATLAS rig. Pick a joint and an axis, then drag the gold
ring or use the rotation sliders. Drag outside the ring to orbit. Pick an expression, scrub to a time, and
use **Set key** to save or replace the complete pose and expression. Click a key to jump to it, or use
**Play** to loop the four-second timeline. Edits are session-only; reopening starts with the demo keys.
ATLAS is an original rigid-skinned model released under [CC0](character-poser.LICENSE.md).

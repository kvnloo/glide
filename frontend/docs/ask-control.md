# Questions as controls (`ask_control`)

When the agent needs a quick decision, it can call `ask_control` instead of asking in its reply.
The pane draws the question as a sheet over the composer, and the answer returns to the agent as
the user's next message, for example `Picked "SQLite" for: Which database? (db = sqlite)`. The answer
stays in the session's history like anything the user types.

| Control | Keys |
| --- | --- |
| Choice, candidates | <kbd>1</kbd>…<kbd>8</kbd> picks · <kbd>↑</kbd> <kbd>↓</kbd> and <kbd>Enter</kbd> · a click |
| Several choices (`multiple`) | <kbd>1</kbd>…<kbd>8</kbd> or <kbd>Space</kbd> checks · <kbd>Enter</kbd> sends |
| Slider | <kbd>←</kbd> <kbd>→</kbd> one step · <kbd>PgUp</kbd> <kbd>PgDn</kbd> ten · <kbd>Home</kbd> <kbd>End</kbd> · the −/+ buttons |
| Confirm | <kbd>Y</kbd> · <kbd>N</kbd> · <kbd>Enter</kbd> |

<kbd>Esc</kbd> closes the sheet without an answer, and the card's **Answer** button opens it again.

## How it works

- **The tool** (`controls.py`) checks the control against the schema and returns at once. It does
  not wait for the user: the model ends its turn, and the answer arrives as a new prompt. The tool
  refuses when no live `hermes tern` pane shows the chat (the `viewers` registry, including the
  delegator's compression lineage), so a headless session gets an error it can act on.
- **The sheet** (`src/controls/`) opens when the call's `tool.complete` arrives. It uses the ask
  sheet's roles (`omp.overlay.ask`, its option list and action row), so Tern sizes it like the
  clarify sheet. A typed or spoken reply can answer it through the same interaction model
  (`Controls.hear`).
- **The answer** goes through the prompt router as a queued prompt, behind any running turn. It is
  sent literally, so a `{!cmd}` in a model-written label never runs a shell command.
- **Two panes on one chat:** the first answer claims the control in
  `$HERMES_HOME/plugin-data/glide/controls/<session>.<call>.<control>.json`. The other pane closes its
  sheet and shows that answer, and a resumed chat reads its answers back onto their cards.

## Schema

The control's shape is [Ripple](https://github.com/kvnloo/ripple)'s fast-control schema, vendored
unchanged in `src/vendor/ripple/` with its conformance vectors (`vectors.json`). The Python parser
(`tests/test_controls.py`) and the sheet (`src/__tests__/controls.test.ts`) both run those vectors, so
they accept the same controls. Tern reports clicks, not pointer paths, so Ripple's drawing and
spatial-pick controls are not offered here.

## Trying it

`lab/fake_model.py` answers the prompt `control` with a choice and `control slider` with a slider.
It calls them through Tool Search's `tool_call` bridge, as a real model does.

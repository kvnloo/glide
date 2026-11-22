# Shared theme (pinned copy)

`glide.json` and `tokens.schema.json` are verbatim copies of kvnloo/ephemeral-ui's `theme/` at the commit
`PIN.json` names; `PIN.json` also records each file's sha256 and the card catalog's version and kinds.
Glide reads `glide.json` for Dash's night, the gold, radii, type ramp, tracking and glass
(`glide/frontend/sharedTheme.ts`, `glide/whole_theme.py`). Never edit the copies. To move the pin, from
the repo root:

    python3 glide/tools/check_shared_theme.py --upstream main    # exit 1: stale copy or uncovered catalog kind
    python3 glide/tools/check_shared_theme.py --vendor <ephemeral-ui checkout at the new commit>
    python3 glide/tools/site_tokens.py
    python3 -c 'from glide import whole_theme; b = whole_theme.dash_theme_bytes(); open("glide/themes/dash.json", "wb").write(b)'

`glide/tests/test_shared_theme.py` fails until `glide/site/tokens.css` and `glide/themes/dash.json` match.

# Glide landing page

A static page with an interactive demo of the `/glide` card flow: Detect, then Build memory, Turn on, recall, a deep-work block with its digest, and the `/theme` picker. It has no build step and no dependencies, and the demo never reaches the network. It runs on the synthetic sessions from [`demo/seed.py`](../demo/seed.py).

| File | Role |
|---|---|
| `index.html` | The page |
| `model.js` | The demo as a pure state machine (`submit`, `press`, `tick`, `key`) |
| `app.js` | Draws the model and feeds it clicks, keys and the demo clock |
| `style.css` | Uses only the variables in `tokens.css` |
| `tokens.css` | Generated from `glide/frontend/tokens.ts` by `python glide/tools/site_tokens.py` |

## Preview

```sh
python3 -m http.server 8817 --directory glide/site
```

## Check

```sh
python -m pytest -q glide/tests/test_site.py            # tokens fresh, drift rules, references, demo model
node --test glide/site/model.test.mjs                    # the demo model alone
node glide/tools/site-check.mjs http://127.0.0.1:8817/ /tmp/site-check   # drives the page in headless Chrome
```

`site-check.mjs` clicks through every demo step, checks the 412 px layout and its 44 px tap targets, fails on any console error, and writes screenshots.

## Publish

Any static host can serve `glide/site/` as the web root, with no build command. GitHub Pages can serve only the repository root or `docs/`, so it needs either a Pages workflow or a host that accepts a subdirectory (Cloudflare Pages or Netlify, with the output directory set to `glide/site`).

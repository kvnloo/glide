# Run the Glide tester army on Boat

This ports `kvnloo/trafficiq`'s `feat/e2e-tester-army:e2e/army` template. W4 uses `e2e explore`; W5 adds deterministic Playwright sweeps. Each lane owns one disposable Boat sandbox. Neither incomplete coverage nor an unreviewed screenshot is a certified PASS.

## Deterministic sweeps (W5)

From this directory, without a provider key:

```sh
SWEEPS=1 CANARY=1 LANES=8 bash boat/up.sh
```

This freezes kit `c3b7b275`, `origin/main`, and `origin/feat/eui-fleet-vendor`. Three kit lanes and four Tern lanes per Glide revision cover clicks, themes, console errors, and served build provenance. Kit has no Glide build lane. `ONLY` selects lane IDs; `MAIN_SHA`, `PR_SHA`, and `KIT_SHA` override the frozen references. `KIT_DIR` is required: point it at the published gh-pages worktree, not the dirty authoring tree. No model participates in any verdict.

- Clicks record each visible action, checkbox, and select option. Disclosures open before inventory; actions run before destructive filters. A field's value alone is not app feedback. Duplicate intents are findings. Canvas-only and CSS-only gallery effects, replay, and already-selected controls need a stronger oracle and are classified as test bugs, not certified dead actions. Animated/intercepted controls produce explicit automation gaps; scrolling has a four-second bound.
- Themes cover all nine themes, three fleet kinds, and widths 390/768/1440: 81 clean cases. The matching three seeds are calibrated in one light/390 host case before clean coverage. Data consistency reads the same authored HOSTS fixture used by the card.
- Console runs the clean click/gallery/theme traversal and preserves every console.error and pageerror. Graphics initialization errors are provider gaps.
- Build records the archive SHA and disk PIN but refuses to infer served-pane provenance from them. Missing queryable pane provenance fails coverage.

Every lane first runs the Chromium style-detector fixtures, the same-URL seeded-to-clean fixture, and the rendered control-order fixture. Each navigation commits `about:blank` before loading the target, so hash-only navigation cannot retain planted mutations or multiply intent listeners. The regression verifies that the count observer, injected CSS, and dead-button handler disappear and one clean click emits exactly one intent. Matching recall is exact detector + selector + seed ID, not text matching. Clicks require 1/1; themes require 3/3. Console/build have no matching planted seed: recall is not applicable. The receipt auditor rejects kit click/theme results without this isolation proof.

The Tern web server creates its own pane; native `ctl run` is not proof that its web client launched Glide. The deterministic path supplies a private launch executable as `SHELL`; that executable re-exports the private profile because the PTY can replace environment variables. Tern-generated pane identity is preserved. A real `hermes tern --help` registration probe precedes launch. The explorer path retains native `serve --control`. The PNG is checked for a uniform framebuffer: accessibility nodes and zero console errors alone do not prove pixels painted. Blank frames, unsupported native styles, missing transcript cards, and absent pane provenance remain coverage gaps.

`boat/diagnose.py web-help`, `boat/diagnose.py plugins`, and `boat/diagnose.py gpu` are bounded Boat diagnostics. They collect outputs even after remote failure, then delete their owned sandbox. Their accounting and deletion receipts use the same lifecycle owner.

Set `RUN` to a full eleven-lane artifact directory, then audit it:

```sh
python3 audit_run.py "$RUN"
python3 ledger.py ~/.local/state/glide-army/boat --since 20261111T235205Z
```

The first command checks exact lane IDs, fixtures, canary recall, PNG signatures, usage, concurrency, and sampler coverage. Exit 0 means consistent receipts, not app acceptance. The ledger includes failed attempts and diagnostics, reads a fresh Boat list, checks the cross-run peak, and never adds overlapping account-wide billing deltas. Usage is sampled immediately before deletion, so teardown latency is excluded.

To replace invalid lane receipts at the same frozen app/kit SHAs without rerunning unaffected lanes:

```sh
python3 compose_run.py "$BASE" "$REPLACEMENT" runs/w5-final
python3 findings.py runs/w5-final > /tmp/w5-findings.log
python3 sanity.py runs/w5-final
python3 audit_run.py runs/w5-final
```

The output must not exist. `run.json` records every lane's source campaign and both payload hashes. All source sandboxes, including superseded lanes, remain in accounting. This is a composite evidence bundle, not a fresh eleven-sandbox run. Keep it outside `runs/boat` so the ownership ledger counts only original creation receipts. Original reports and screenshots are untouched; overlapping account-wide billing deltas are never added.

Run artifacts contain structured per-control results, checks, console records, PNGs, `FINDINGS.md`, and the pending premium-review sampler. See `REPORT.md` for measured outcomes and limitations, and `SWEEPS-DESIGN.md` for ownership and design rationale.

## Model-explorer smoke (W4)

Run from `frontend/e2e/army` through the operations `with-keys.sh` wrapper. It loads `NVIDIA_API_KEY` from bws without writing or printing it.

```sh
export PATH="$HOME/.hermes/bin:$PATH"  # includes the existing bws executable
WITH_KEYS=/path/to/operations/with-keys.sh
"$WITH_KEYS" env KIND=kit ONLY='^kit-hosts$' LANES=1 STEPS=2 AI_TRACE=1 CANARY=1 bash boat/up.sh
"$WITH_KEYS" env KIND=tern ONLY='^tern-hosts$' LANES=1 STEPS=2 bash boat/up.sh
```

Set `KIT_DIR` to a self-contained built kit directory containing `fleet.html` and `index.html`. It is required; no host path is baked in. The runner copies it before injection and never edits it. Kit goals navigate to `/fleet.html?w=1440`, `/fleet.html?w=390`, and `/`. Query strings stay out of `app.url` because e2e rejects them there.

For a later full run, omit `ONLY`, use `STEPS=8`, and keep `LANES` between 1 and 3. Do not edit `up.sh` or the runner while it is live. Each invocation freezes a payload before starting lanes.

## Pair one lane

```sh
"$WITH_KEYS" env ONLY='^kit-hosts$' PAIR_LANE=kit-hosts PAIR_MODEL=second-nim-model GLIDE_SHA=exact-commit bash boat/up.sh
```

`PAIR_CONFIG=paired-lane.json` selects the checked-in paired configuration instead of the two variables. Its second model is advertised by NIM but returned no tool call during this run, so G0 currently blocks it.

The pair inherits the same goal, target, kit payload and Glide SHA. Both models must pass G0. The NIM endpoint is the only enabled provider. A paid premium re-judge is prepared, not silently executed. Use `sanity.py RUN --pair first-id second-id` to regenerate the title diff. Different goals, targets, SHAs, or identical model IDs are rejected.

## Read the receipts

Each invocation writes `$ARMY_RUNS/boat/<UTC>/` (default `~/.local/state/glide-army`, outside the worktree so `git worktree remove` cannot delete evidence; `OUT` overrides one run):

- `run.json` records the exact SHA, snapshot, frozen payload hash, lane configuration, sandbox IDs, deletion status, and account-wide VM minutes from billing before and after. Per-sandbox usage receipts separate this run from unrelated activity.
- `g0/` contains a real kit screenshot, rendered canary checks, and the canonical image/tool/schema probe results. No explore lane starts unless every selected model passes.
- Each lane contains `runs/lane.json`, the exact stage and exit code, setup errors, explore logs, report JSON, screenshots, and optional AI trace.
- `FINDINGS.md` and `findings.json` separate coverage gaps from app findings and report each canary defect detected per lane.
- `SANITY.md` and `sanity-manifest.json` select at least 10% of PASS screenshots randomly, plus every zero-finding lane. The seed is recorded. A premium reviewer must record missed defects, degraded lanes, and the miss rate. Until then, no PASS is trusted.

Model-explorer canary recall uses conservative finding-text matching and lists the matching titles for human confirmation. Deterministic recall uses detector tags and selectors instead. The seeded defects are one dead Open chat button, a black header surface in light theme, a clipped phone title, and an impossible online count. Two steps cannot establish recall. Canary misses void PASS.

## Isolation and budget

The snapshot key includes the e2e lockfile hash, setup script, exact Glide SHA, pinned Hermes tag and commit, and Tern and Bun binary hashes. Its secret-free builder prepares npm dependencies, a disposable Hermes tag checkout with a private venv, a Tern binary, and a rebuilt Glide frontend. Snapshot clones receive keys only after creation. Each lane is started with `boat exec --detach`, collected, and deleted immediately with `boat delete ID --yes`. Exit cleanup deletes remaining owned sandboxes and `boat list` verifies absence.

The runner refuses nonzero wallet balances, automatic top-up, extra starts, paid starts, insufficient plan hours, exhausted start quotas, and paid snapshot slots. It does not enable a wallet or extra starts. Quota errors stop the run instead of retrying in a loop.

Tern uses fresh private HOME, HERMES_HOME, TMPDIR, TERN_CONFIG_DIR, daemon and explicit control sockets. Its web listener binds a free loopback port. The config and dotenv are created for that lane only. No owner config, history, `auth.json`, bots, or API-server listener are copied. Only the authorized free NIM model is configured, fallbacks are empty, and delegation is excluded from the allowed toolsets. The exact-SHA plugin archive is registered in the private plugin directory.

Never run `hermes update` (or `hermes profile use`, `hermes gateway restart`) from a test/film lane.

## Verify the infrastructure

```sh
nice -n 10 python3 tests/test_army.py
python3 -m py_compile *.py boat/*.py
bash -n boat/up.sh boat/lane.sh boat/setup.sh
node --check boat/capture.mjs
```

Run larger test suites through `fleet-build`. All browser screenshots and model smokes run on Boat, never the host desktop. Model/provider errors, unsupported automation, interrupted sessions, and missing reports are coverage gaps. Reproduce every app finding against its actual PNG before changing application code. Native select popups and software-WebGL stalls can be automation limitations rather than app defects.

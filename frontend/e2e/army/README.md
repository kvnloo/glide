# Run the Glide tester army on Boat

This ports `kvnloo/trafficiq`'s `feat/e2e-tester-army:e2e/army` template. Each goal runs through the real `e2e explore` package in Chrome, in its own disposable Boat sandbox. This is infrastructure, not a completed qualification run.

## Run a smoke

Run from `frontend/e2e/army` through the operations `with-keys.sh` wrapper. It loads `NVIDIA_API_KEY` from bws without writing or printing it.

```sh
export PATH="$HOME/.hermes/bin:$PATH"  # includes the existing bws executable
WITH_KEYS=/path/to/operations/with-keys.sh
"$WITH_KEYS" env KIND=kit ONLY='^kit-hosts$' LANES=1 STEPS=2 AI_TRACE=1 CANARY=1 bash boat/up.sh
"$WITH_KEYS" env KIND=tern ONLY='^tern-hosts$' LANES=1 STEPS=2 bash boat/up.sh
```

Set `KIT_DIR` to a self-contained built kit directory containing `fleet.html` and `index.html`. The default is the kit source directory specified in W4's brief. The runner copies it before injection and never edits it. Kit goals navigate to `/fleet.html?w=1440`, `/fleet.html?w=390`, and `/`. Query strings stay out of `app.url` because e2e rejects them there.

For a later full run, omit `ONLY`, use `STEPS=8`, and keep `LANES` between 1 and 3. Do not edit `up.sh` or the runner while it is live. Each invocation freezes a payload before starting lanes.

## Pair one lane

```sh
"$WITH_KEYS" env ONLY='^kit-hosts$' PAIR_LANE=kit-hosts PAIR_MODEL=second-nim-model GLIDE_SHA=exact-commit bash boat/up.sh
```

`PAIR_CONFIG=paired-lane.json` selects the checked-in paired configuration instead of the two variables. Its second model is advertised by NIM but returned no tool call during this run, so G0 currently blocks it.

The pair inherits the same goal, target, kit payload and Glide SHA. Both models must pass G0. The NIM endpoint is the only enabled provider. A paid premium re-judge is prepared, not silently executed. Use `sanity.py RUN --pair first-id second-id` to regenerate the title diff. Different goals, targets, SHAs, or identical model IDs are rejected.

## Read the receipts

Each invocation writes `runs/boat/<UTC>/`:

- `run.json` records the exact SHA, snapshot, frozen payload hash, lane configuration, sandbox IDs, deletion status, and account-wide VM minutes from billing before and after. Per-sandbox usage receipts separate this run from unrelated activity.
- `g0/` contains a real kit screenshot, rendered canary checks, and the canonical image/tool/schema probe results. No explore lane starts unless every selected model passes.
- Each lane contains `runs/lane.json`, the exact stage and exit code, setup errors, explore logs, report JSON, screenshots, and optional AI trace.
- `FINDINGS.md` and `findings.json` separate coverage gaps from app findings and report each canary defect detected per lane.
- `SANITY.md` and `sanity-manifest.json` select at least 10% of PASS screenshots randomly, plus every zero-finding lane. The seed is recorded. A premium reviewer must record missed defects, degraded lanes, and the miss rate. Until then, no PASS is trusted.

Canary recall uses conservative finding-text matching and lists the matching titles for human confirmation. The seeded defects are one dead Open chat button, a black header surface in light theme, a clipped phone title, and an impossible online count. Two steps cannot establish recall. Canary misses void PASS.

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

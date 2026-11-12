# Fleet cards verification

## Delivered

`glide.fleet` returns local hosts, Taste portfolios, or factory graph snapshots. Source workers have five-second deadlines. Cards cache for 30 seconds, and GitHub repository results cache for 60 seconds. Missing sources produce visible diagnostics.

`/hosts`, `/portfolio [key]`, and `/factory graph` publish through the existing owner-scoped card registry and kit sandbox. All seven contract action IDs have tested effects. Message actions draft without sending. Pod descriptions use the read-only `glide.fleet_pod` verb. Refresh replaces the current publication revision. Stale callbacks and model-authored fences cannot grant host operations.

The host wrapper displays `data.notes` and `host.notes` separately, then removes only those diagnostic extensions before kit schema validation. Both source validators accept all six available-source and missing-source projections. Product IDs include the portfolio key because the work config reuses component IDs.

The agent prompt requires data from `glide.fleet` and forbids invented fleet data. The new feature inventory contains six rows in `frontend/e2e/features.fleet.json`.

## Executed checks

All suites, typechecks, builds, and native-action integration checks ran on the MBP through `fleet-build`. Local checks were limited to Git, source inspection, shell syntax, the single-file prompt check, and repository guards.

| Command | Exit | Result |
| --- | --- | --- |
| `python -m pytest glide/tests/test_fleet.py -q --junitxml=fleet-verify-artifacts/fleet.xml` | 0 | 76 passed |
| `python -m pytest glide/tests tests -q --junitxml=fleet-verify-artifacts/python.xml` | 0 | 584 passed, 14 subtests passed, 17 deselected by the existing CI profile |
| `python glide/tests/verify_fleet_schema.py .fleet-verify-schema.json --output fleet-verify-artifacts/fleet-docs.json` | 0 | Six kit-input projections passed the full JSON Schema with format checks |
| JavaScript source `validateFleet` over the same projections | 0 | Six passed |
| `bun run test --reporter=default --reporter=junit --outputFile.junit=fleet-results/junit.xml` | 0 | 235 files, 2,384 tests passed, one existing todo |
| `bun run typecheck` | 0 | Two diagnostics in the pinned Hermes dependency excluded by the existing checker |
| `bun run lint` | 0 | Passed |
| `node scripts/build.mjs` | 0 | Bundle built |
| `bun run check:strict` | 0 | Passed |
| `bun run check:suppressions` | 0 | Passed |
| `bun run check:size` | 1 | Pre-existing `glideCommand.test.ts` has 670 lines against a 600-line ceiling |
| `python3 glide/tools/check_layout.py --upstream upstream/main` | 1 | Five pre-existing missing baseline entries, listed below |
| `python3 glide/tools/check_privacy.py --upstream upstream/main` | 0 | No findings |
| `python3 glide/tools/check_upstream_sync.py` | 0 | Passed |

The frontend run includes 49 fleet checks. Five drive the real source kit through App and native Tern actions, covering host expansion, drafting, refresh, session resume, pod descriptions, task URLs, factory graph controls, and inert model fences. Tests used headless in-process surfaces, not a desktop window.

Tests failed before implementation for the missing collector, missing commands, missing trusted-kit publication, duplicate component IDs, wrapper-process detection, and missing prompt guidance. The matching checks pass after the changes.

## Repeatable verification

`glide/tools/verify_fleet.sh` stages the CI test-core commit from an existing Hermes Git checkout, checks staged hashes, runs locked Python dependencies, and fetches logs, JUnit, and schema evidence. Inputs are `HERMES_SRC`, `FLEET_KIT_SRC`, and optional `FLEET_OUT`.

`frontend/scripts/fleet-verify.sh` stages the pinned runtime source and installs frozen Bun dependencies. With `FLEET_KIT_SRC`, it builds a temporary fleet kit without changing the vendor tree. It runs the command supplied as its arguments. With `FLEET_OUT`, it fetches `frontend/fleet-results`. The final run used `bash scripts/fleet-python.sh` around the frontend commands in the table.

## Remaining integration work

The orchestrator owns vendoring the new fleet kinds and CSS. The vendor script, vendor tree, and `PIN.json` are unchanged. Until that pin update, commands display an explicit unavailable state rather than sample data. W2 owns merging the six feature rows and adding the fleet journey.

The existing layout gate also reports these files from earlier commits:

- `frontend/src/__tests__/intentCards.test.ts`
- `frontend/src/__tests__/intentFixtures.ts`
- `frontend/src/__tests__/orbit.test.ts`
- `frontend/src/__tests__/transcriptCardActions.test.ts`
- `frontend/src/voice/orbit.ts`

The fleet additions have path-specific baseline entries tied to tracking issue #265. No existing size or strictness ceiling was raised. The unrelated gate failures remain visible.

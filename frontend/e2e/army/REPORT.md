# W4 infrastructure receipt, 2026-11-11

Status: blocked at G0. Infrastructure is committed, but neither requested explorer smoke ran. No app PASS, seeded-defect recall verdict, premium re-judge, or paired-model qualification is claimed.

## Prepared

- Ported the trafficiq tester-army dependency lock, CDP Chrome browser, goals/configuration, snapshot-and-clone workflow, and report aggregation into this directory.
- Added kit desktop/phone and isolated Tern desktop/phone targets, 14 interactive goals, a paired-lane configuration, strict G0 enforcement, four served-copy defects, per-lane recall, and premium-review sampling/diff tools.
- Built the reusable secret-free Boat snapshot `glide-army-5ae480ebbfeda4f5`. It contains npm e2e dependencies, a disposable Hermes tag checkout and venv, Tern, staged Bun 1.4.4, and the rebuilt Glide frontend.
- Frozen plugin revision: `32d2bd723d982a13cb3afd22066c2bd51639387a`. Hermes tag: `v0.23.1+canary.20261110T064422Z`, commit `da06acacc986ebe8e9c74f5a7b2867c5a8a7d64b`. Tern: `0.9.9`, build `9c1c09f`.

## Actual verification

The initial contract test failed with `ModuleNotFoundError: canary` before implementation. The final suite covers copy-only injection, idempotency, provider-gap classification, recall isolation, minimum 10% sampling, paired-run identity, plan-only budget guards, deletion despite usage-query failure, empty planner rejection, checked-in pair selection, and private runtime defaults.

Small single-file checks ran locally at `nice -n 10`. The contract suite, Python compilation, Bash syntax checks, and JavaScript syntax checks also ran on the MBP through `fleet-build`. Fleet receipts include `fleet-mbp-67cdbc3020b64b98` and `fleet-mbp-07be3316fdd7457f`, both exit 0. The final rerun, `fleet-mbp-146fc09772364390`, passed all 11 contract tests plus Python, Bash, and JavaScript syntax checks with exit 0.

Chrome actually loaded the frozen kit on Boat. The final rendered receipt at `runs/boat/20261111T230627Z/g0/runs/g0/rendered-check.json` confirms all four planted defects:

- The first enabled Open chat button dispatches no intent.
- The light-theme header computes to black.
- The phone title has scroll width greater than client width at 390px.
- The online count reads the deliberately impossible `99/6`.

The clean desktop JPEG and seeded phone PNG were inspected. Source kit files were not edited. G0 uses a clean screenshot with visible Open chat and Nudge buttons, not the intentionally broken surface.

## G0 blocker

The default `google/gemma-4-31b-it` is advertised by NIM's models endpoint, but both canonical image/tool and image/schema requests return HTTP 404 with empty response bodies. This occurred from Boat and in a network-only diagnostic using the saved Boat screenshot.

Two bounded, advertised free fallbacks were probed using the same canonical script and real screenshot:

| Model | Image/tool request | Schema request | G0 |
|---|---|---|---|
| `google/gemma-4-31b-it` | HTTP 404 | HTTP 404 | Failed |
| `nvidia/nemotron-3.5-super-vl-120b-a12b` | No tool call, null content | Valid JSON | Failed |
| `meta/llama-3.2-90b-vision-instruct` | Timed out after 120.2s | Valid JSON after 48.4s | Failed |

No bypass was used. Kit `--max-steps 2 --ai-trace` stopped before explorer launch at this gate. Tern startup and its two-step explorer smoke remain unverified because no model passed the required pre-lane gate. The Tern failure stage is therefore G0 admission, not an observed Tern runtime failure. No additional model attempts or premium calls were made.

`FINDINGS.md`, `SANITY.md`, and JSON manifests were generated for the stopped runs. They contain no completed lanes and no certified PASS. The sampler's 31-PNG regression case selects four PASS screenshots and includes every zero-finding lane. `paired-lane.json` configures a second model, but its current no-tool result also keeps the pair blocked.

## Resolved setup failures

- The operations key wrapper initially could not find bws. Adding the existing `~/.hermes/bin` to PATH fixed the wrapper without changing it or exposing keys.
- Boat's preinstalled Bun 1.3.14 cannot read the repository's version-2 lockfile. The snapshot now stages the existing compatible Bun binary and includes its hash in the snapshot key.
- Concurrent kit work replaced the Agents button with a select. G0 now checks the actual visible action rather than the obsolete tab markup.
- Same-fragment navigation retained an open details element. G0 now reloads before checking the seeded copy.
- An initial local `tern serve --help` inspection unexpectedly started a headless renderer. Only that owned process was terminated. All browser rendering and canary interaction ran on Boat, with no host desktop input or focus changes.

## Sandboxes and plan time

| Sandbox | Purpose | Recorded VM seconds | Deleted |
|---|---|---:|---|
| `bx_q29kgxa2` | First builder, incompatible Bun | 36 | Yes |
| `bx_g2a5f5zx` | Successful dependency snapshot builder | 77 | Yes |
| `bx_4vhdypdd` | G0, obsolete control assertion | 43 | Yes |
| `bx_6fak3jph` | G0, fragment-navigation assertion | 69 | Yes |
| `bx_2y8hdc6t` | Rendered canary passed, provider G0 failed | 68 | Yes |

Recorded sandbox usage totals 293 seconds, or 4.8833 VM minutes. The sum of each attempt's account-wide `boat billing` before/after delta is 15.4833 minutes. That larger number includes an unrelated running owner sandbox. Per-sandbox usage was recorded immediately before deletion, so final teardown may add a few seconds beyond those samples.

`boat list` after cleanup confirms all five created IDs are absent. The unrelated owner sandbox was left untouched. Wallet balance stayed $0, extra starts stayed off, and no wallet, top-up, paid starts, or extra snapshot storage was enabled. The reusable snapshot remains in an included free slot.

## Remaining work

Restore a free model that passes image input, tool calls, and structured output, then rerun exactly one kit lane and one Tern lane. The later full army, premium screenshot re-judge, recall qualification, and paired findings comparison are separate runs. Tern's private startup path and detached explorer result collection still need runtime verification once G0 admits a model.

# W5 deterministic sweeps, 2026-11-12

Status: receipt audit passed; application qualification failed. Every selected lane exited 1 for findings or coverage gaps. No native Tern UI PASS or premium screenshot review is claimed.

## Final evidence and provenance

The final local bundle is `/mnt/zer0models/worktrees/glide-army/frontend/e2e/army/runs/w5-final`. It contains `FINDINGS.md`, `findings.json`, `SANITY.md`, `sanity-manifest.json`, `audit.json`, and the selected lane logs, DOM dumps, checks, controls, and PNGs. Artifacts remain ignored, following the existing army convention.

| Input | Frozen revision |
|---|---|
| Published kit | `c3b7b275521e125fc303b683fe5c752eabdfd5e2` |
| Glide main | `f83c6c59d25234a0d6f8dca846907c1ebb324738` |
| Glide PR #269 | `792f68518f5a0c560982babd730833ee3a5392a2` |
| Dependency snapshot | `glide-army-5ae480ebbfeda4f5` |

Two full eleven-lane campaigns ran on Boat. Final semantic review then found that same-URL/hash navigation retained the planted observer, CSS, dead-button handler, and a second intent listener in kit clicks/themes. Those original clean classifications were invalid. Their reports/PNGs remain untouched, with `INVALIDATED.md` alongside them; the current auditor rejects both full campaigns for missing isolation proof. The strict-theme subset had the same defect and is also superseded. Do not use their original counts.

The corrected helper commits `about:blank` before each target load. A real Chromium regression first failed with `99/6 online` still present, then passed after the fix, checking seed removal and exactly one clean intent. Kit clicks/themes were rerun at the same frozen revisions. The first clean phone case now displays `4/5 online`; no clean dead-control or duplicate-intent app finding remains in the corrected click lane.

`compose_run.py` selects the corrected kit lanes from `runs/boat/20261112T012907Z-sweeps` and the unaffected clean-only console/Tern lanes from `runs/boat/20261112T010159Z-sweeps`. `run.json` records each lane's source and payload hash. This is eleven selected lane reports backed by thirteen source sandboxes, not one fresh eleven-sandbox run. Superseded source sandboxes remain in accounting. The corrected theme run and unaffected console traversal have the same 547 contrast case/selector identities and measured styles; older ratios have two-decimal rather than four-decimal output. The comparison receipt is `runs/boat/20261112T012907Z-sweeps/theme-cross-check.json`.

## Findings and coverage

Counts are non-canary observation records, including repeated checks across lanes, themes, and widths—not distinct root causes.

| Classification | Finding records | Coverage-gap records | Combined |
|---|---:|---:|---:|
| real defect | 1,139 | 0 | 1,139 |
| test bug | 1,442 | 230 | 1,672 |
| provider gap | 0 | 16 | 16 |

- Real defects: 1,094 contrast observations across theme and console traversals; 44 disabled-without-reason observations across click and console traversals; one main archive vendor-PIN mismatch. The main disk PIN is `63e06b29ffb0d7c5b9d482abebc0312335897321`, not the required kit revision. PR #269's disk PIN matches. Neither disk result certifies the served pane.
- Test bugs: 1,266 non-flat/gradient contrast observations needing a pixel-aware oracle, 176 ambiguous canvas/CSS/replay feedback observations, and 230 animated/intercepted/unsupported control automation gaps. These are not asserted application defects.
- Provider gaps: two per native lane. Private web-PTY startup now exposes transcript accessibility articles, but actual native captures remain uniformly white, styled transcript card DOM is absent, and served-pane build/PIN provenance is not queryable. Native clicks, computed styles, and console coverage remain unqualified. Zero browser console errors is not proof that a native UI rendered.

Corrected kit clicks recorded 943 observations (37 calibration, 906 clean), covering nine fleet kind/width combinations and all 55 frozen gallery examples. The clean-only console lane recorded 906 control observations, the same 55 gallery examples, and the full theme matrix. Kit themes ran all 81 unique clean combinations: nine themes × three widths × three kinds, plus one seeded calibration case. Browser `pageerror` and `console.error` arrays were empty in all eleven selected reports; native target coverage still failed.

A representative clean contrast finding is `10 agents`, 11px, ratio 4.1098 against its computed backdrop at t3-light/390. Full selectors, measured values, theme, width, reproduction steps, and absolute screenshot paths are in final `FINDINGS.md` and `findings.json`.

## Matching recall and sanity handoff

| Sweep | Kit | Tern main | Tern PR #269 |
|---|---|---|---|
| clicks: dead button | 1/1 | 1/1 | 1/1 |
| themes: black surface, phone clipping, wrong count | 3/3 | 3/3 | 3/3 |
| console | N/A | N/A | N/A |
| build | N/A | N/A | N/A |

Tern calibration runs on the served kit copy. It proves the matching detector, not native Tern coverage. Console/build have no matching planted defect; N/A is not 100% recall.

`sanity.py` retained four of 33 candidate PASS screenshots (seed `20261112`) and every one of seven zero-finding lanes. Premium re-judge is pending for the orchestrator; miss rate is unknown and no PASS is trusted. No model participates in deterministic verdicts.

## Commands and actual exits

Commands below ran from `frontend/e2e/army`. Browsers and application builds ran headlessly on Boat, never on the owner's display.

```sh
SWEEPS=1 MAIN_SHA=f83c6c59d25234a0d6f8dca846907c1ebb324738 PR_SHA=792f68518f5a0c560982babd730833ee3a5392a2 LANES=8 CANARY=1 python3 boat/up.py
SWEEPS=1 ONLY='^kit-sweep-(clicks|themes)$' MAIN_SHA=f83c6c59d25234a0d6f8dca846907c1ebb324738 PR_SHA=792f68518f5a0c560982babd730833ee3a5392a2 LANES=2 CANARY=1 python3 boat/up.py
```

Both commands exited 1: the full campaign contains findings/gaps and superseded kit evidence; the corrected subset contains 22 disabled-reason findings plus test gaps in clicks and 547 contrast findings plus unresolved gradient checks in themes. No setup error occurred in either corrected lane. Their Chromium detector/navigation fixtures and rendered controller fixtures passed.

The off-host verification command exited 0, receipt `fleet-mbp-fa26dc1f32f64978`: 28 Python tests, five Node tests, JS syntax, Python compilation, and Bash syntax.

```sh
fleet-build --node mbp --light --src-include frontend/e2e/army -- bash -euc 'cd frontend/e2e/army; python3 -m unittest discover -s tests -p "test_*.py"; node --test tests/sweep-audit.test.mjs; node --check sweeps.mjs; node --check sweep-navigation.mjs; node --check tests/sweep-browser-contract.mjs; python3 -m py_compile *.py boat/*.py; bash -n boat/up.sh boat/lane.sh boat/setup.sh'
```

Final artifact commands all exited 0:

```sh
python3 compose_run.py runs/boat/20261112T010159Z-sweeps runs/boat/20261112T012907Z-sweeps runs/w5-final
python3 findings.py runs/w5-final
python3 sanity.py runs/w5-final --seed 20261112
python3 audit_run.py runs/w5-final
python3 ledger.py runs/boat --since 20261111T235205Z
```

Exit 0 from `audit_run.py` means consistent receipts, not application acceptance. The same auditor now exits 1 on each original full campaign, explicitly rejecting its two contaminated kit lanes. The initial navigation regression command, `CHROME_EXE=/opt/google/chrome/chrome node tests/sweep-browser-contract.mjs`, exited 1 on Boat before the fix; `node tests/sweep-browser-contract.mjs` passed in both corrected lane startups.

Representative inspected captures:

- `/mnt/zer0models/worktrees/glide-army/frontend/e2e/army/runs/w5-final/kit-sweep-themes/runs/kit-sweep-themes/0004-fleet-hosts-t3-light-390-clean.png`
- `/mnt/zer0models/worktrees/glide-army/frontend/e2e/army/runs/w5-final/tern-pr269-sweep-build/runs/tern-pr269-sweep-build/0002-tern-initial.png`

## Accounting and remaining blockers

`runs/boat/W5-LEDGER.json` lists every one of 43 owned sandbox IDs, including failed probes and superseded campaigns. A fresh `W5-boat-list-final.json` confirms all are absent. Global peak concurrency was eight. There are no ledger errors, warnings, missing usage receipts, or undeleted owned sandboxes. The unrelated owner sandbox was not modified.

Per-sandbox usage sampled immediately before deletion totals 158.73333333333332 VM minutes across all W5 attempts. The thirteen source sandboxes backing the composite total 64.58333333333333 VM minutes, including two superseded lanes. Samples exclude teardown latency. Source account-wide deltas are preserved separately (50.31666666666667 and 16.016666666666666 minutes), include unrelated activity, and are not added across overlapping runs. Wallet balance stayed zero, automatic top-up and extra starts stayed off, and the existing included snapshot was reused.

Remaining gates: obtain a painted, deterministically observable native Tern transcript surface; expose served-pane build/PIN provenance; resolve the explicitly listed gallery/gradient automation gaps; review/fix reported app defects; and have the orchestrator complete the premium screenshot re-judge. These blockers keep `done:false`.

---

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

## W5 free-tier sanity check: premium re-judge (orchestrator, claude-opus-5-5, 2026-11-11)

Reviewer: claude-opus-5-5 (manager), image review of each PNG.

| Sampled PASS | Verdict | Note |
|---|---|---|
| kit-sweep-console 0191 fleet-hosts nous 768 | PASS | plurals right (1 agent / 0 agents), no clipping |
| kit-sweep-themes 0082 fleet-hosts slate 1440 | PASS | muted mono lines are the weakest contrast |
| kit-sweep-themes 0022 fleet-hosts nous 390 | PASS | wraps cleanly, no overflow |
| kit-sweep-console 0197 fleet-hosts nous-dark 390 | PASS | no light boxes on dark |

Missed defects in the sample: 0/4, so the miss rate on the sample is 0. The judge independently flagged the muted secondary text as the weakest contrast, and this agrees with the detector's `contrast` finding (4.11:1 < 4.5).

Zero-finding lanes: all 7 are the `tern-*` lanes, and every capture in them is blank white (checked on `tern-pr269-sweep-build/0002-tern-initial.png`). **Their zero findings are VOID, not PASS.** Native Tern coverage instead comes from the isolated real-Tern matrix (W6, and W7 after the stock-transport fix).

Distinct root causes behind 2,827 observation records:
1. **Real.** The kit's light-theme muted text is 4.11:1 (`rgb(113,113,123)` on `#ececed`), which is below AA. Counted 1094 times.
2. **Real.** Disabled card footer buttons have no title or visible reason. Counted 44 times.
3. **Resolved.** The vendor PIN on main at f83c6c5 was stale. #269 has since merged (12f7db7).
4. **Test bug.** Contrast over gradient backgrounds cannot be resolved (1266 records), and dead-control detection on gallery controls fails (176 records).

Paired free-vs-premium lane: not run. No model is in the verdict loop, so there is no model output to pair.


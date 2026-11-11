# Deterministic sweep design

## Phase checklist

- [x] Ground: trace W4 ownership, canary injection, reports and sampler.
- [x] Sketch: compare a new Playwright test-runner stack with a small browser audit behind the existing Python lifecycle owner.
- [x] Agree: proceed without a checkpoint under the fixed W5 brief.
- [ ] Implement: complete detector and target contracts.
- [ ] Verify: execute all lanes on Boat and audit their receipts.
- [ ] Scrap: replace any observation method that cannot distinguish app feedback from incidental animation.

## Usage

`SWEEPS=1 CANARY=1 LANES=8 bash boat/up.sh` freezes kit c3b7b27, origin/main and PR #269, then runs three kit lanes and four Tern lanes per revision. `ONLY` selects an explicit subset for diagnosis. Model APIs and G0 are absent from this path. The original exploratory path keeps its G0 requirement.

## Traced ownership

`boat/up.py` chooses the deterministic entry point. `sweeps_up.main` freezes archives and calls the existing `Army.new/upload/remote/pull/delete` methods. `boat/sweep_lane.py` owns subprocesses inside one sandbox and writes an atomic `lane.json`. `sweeps.mjs` drives Chromium, records per-control outcomes and computed-style evidence, and writes `report.json`. `findings.collect` consumes this report separately from the model-explorer format. `sanity.sample` selects clean PASS captures even from a lane with other findings.

The existing `canary.prepare_site` only changes the served copy. Clean observations block its script; seeded observations reload the same page with the script admitted. Canary classification requires the matching detector, phase and selector. No verdict is based on finding prose.

## Shape

The lane config carries one target, one exact Glide SHA, one expected kit SHA and one sweep name. The browser report contains findings, individual controls, checks, coverage, gaps, screenshots and explicit recall. A provider/setup gap is not a passing app observation. The planner owns sandbox IDs until deletion and a final account list proves they are absent.

## Synthesis decision

Keep W4's lifecycle owner and add a small Playwright audit. The alternative was Playwright Test projects with a matrix per target/theme/width and a second reporter. It would hide browser assertions well, but expose two lifecycle and report systems to the operator and duplicate W4's cleanup/sanity machinery. The chosen design keeps one lifecycle and one reporting boundary. A shell-only coordinator would have fewer Python lines but spread ownership and JSON parsing across traps and background jobs.

A requested independent design/review attempt failed because the account rejected the other model family. No independent review is claimed. Jev also reported no_key. Both limits are recorded rather than bypassed with paid model calls.

## Tradeoffs

- Reuse the W4 dependency snapshot, but rebuild each Tern lane's frontend from its exact archive. This avoids consuming more snapshot slots while preventing a stale vendored bundle from passing.
- Every lane has private output. Only the parent merges receipts.
- Console/build have no matching defect among the four existing seeds. Their recall is not applicable, not 100%. Clicks must catch the dead action; themes must catch the surface, clipping and count defects.
- The premium screenshot re-judge remains pending for the orchestrator. Computed checks do not certify visual taste.

## Risks to resolve with runtime evidence

Can the native Tern web client expose all transcript controls to Playwright? Is build provenance queryable from the pane rather than only from files on disk? Can animation change the DOM while an unrelated dead control is clicked? These are acceptance gates, not reasons to declare partial coverage complete.

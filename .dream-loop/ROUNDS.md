# W8 rounds

The 16:30 correction resumes this ledger. Round 01 is retained after both swapped judges preferred the candidate. Final native qualification remains open.

## Baseline recovery

| Attempt | Evidence | Result |
|---|---|---|
| Original memory preflight | `mbp-baseline-receipt.json` | Exit 75 at the obsolete 6 GiB gate. The retry note supersedes this gate. |
| Initial shell capture | Ignored `baseline/` and `mbp-baseline-retry-receipt.json` | Rejected. The readiness check matched shell command text, not a rendered app. |
| Structural readiness regression | `readiness-red.log`, `test_native_baseline.py` | Reproduced shell-text and error-panel false positives, then required an actual native composer and model leaf. |
| Compatible private stock launch | `native/verified-startup/receipt.json` and `serve/welcome.png` | Exit 0. One real welcome capture, but the navy canvas is not a qualified Dash baseline. The oversized welcome card is visible. |
| Dash with both installed-version binaries | `native/theme-rejected/commands.jsonl` | Tern rejected the private Dash theme. Neither installed binary was replaced. |
| Explicit runtime environment | `isolation-red.log`, `readiness-green.log` | Removed inherited desktop and runtime settings. Seven offline readiness and isolation tests pass. |
| Isolated native retry | `native/isolated-theme-rejected/receipt.json` and `commands.jsonl` | Exit 1: `no theme called "dash"`, despite more than 4 GiB available. The sweep callback was not reached. |
| Environment-only free vision preflight | `efa3733:.dream-loop/free-vision-g0.log` | Exit 1 before any model request. This lookup missed the existing Hermes login-store key. The credential-blocker conclusion was wrong. |
| Post-attachment Dash retry | `native/post-attachment-theme-rejected/receipt.json` and `commands.jsonl` | Exit 1 after the native composer and fake-model leaf mounted. The same theme rejection occurs with 8.3 GiB available. Moving theme selection after attachment did not resolve it. |
| Read-only login-store free probes | `free-vision-rate-limit-1.log`, `free-vision-g0.log` | Both exit 1 with HTTP 429. Waited 60 seconds before one retry. The response confirms a daily free limit of 1,000, with 0 remaining and reset at 2026-11-15 00:00 UTC. No key rotation or paid route. |

The comparison sheet and published board are diagnostic checkpoints only. The board has a clearly empty after panel. Its page and three PNG assets return HTTP 200; asset bytes match the local files.

No product tests, typecheck, lint, token drift, native R01–R17 rubric, full-suite CI, motion clip, or visual acceptance is claimed. No production UI source was changed.

Four additional offline HTTP-handler tests pass. They check quota stops, safe response logging, other HTTP errors, and successful responses. Failing-before and passing-after logs are included.

[Draft PR 342](https://github.com/kvnloo/glide/pull/342) preserves this blocked checkpoint. It is not a finished UI redesign.

## Round 01: welcome form

Hypothesis: replace the full-width welcome card with a compact unboxed lockup, a 32 px mark, and one quiet tip. The palette and Hermes identity stay fixed.

- Baseline: 57 dressed synthetic HEADLESS captures, retained before production edits. `headless/qualified-before/receipt.json` binds source and image hashes.
- Self-review: desktop and phone show a centered lockup with no box or clipping. The original mark is monochrome.
- Regression: `welcomeCohesion.test.ts` fails on the original card and missing tip, then passes all 3 checks.
- Comparison: `rounds/01/compare.png`; overlays: `rounds/01/overlay/`.
- Fresh A/B: `judges/round01/verdict.json`, both orders select candidate.
- Calibration: identical-image control ties in both orders. The owner contrast control ties because omp differs in palette and identity. It is confounded, not proof of owner-preference accuracy.
- Status: retained working preview, not owner approval or native qualification.

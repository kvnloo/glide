# W8 rounds

No production visual round was attempted or accepted. Scores and blind verdicts remain unavailable.

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

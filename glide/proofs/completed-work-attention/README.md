# Retained tool failures and warnings stay visible in completed work

A finished turn folds its pre-answer tool calls into one "Worked" row. Each signal below is a
retained Hermes result that must stay outside that fold, with its card disclosure and real call
outcome, so it is not hidden once the turn ends. The fold predicate is `needsAttention` and the
direct-card list in `frontend/src/view/workLogModel.ts`.

Proof type: vitest fixtures in `frontend/src/__tests__/` that use the pinned Hermes producers where
one exists, the canonical completion envelope, `foldOf`/`parts`, and the SDK `entryNode` tree.
No native Tern host, live gateway or provider was run.

| Issue | Signal | Guard in source | Focused fixtures |
|---|---|---|---|
| #188 | `read_file` `conflict_blocks` report | `readConflictCount` | `readConflictFold.test.ts`, `readConflictIntegration.test.ts` |
| #181 | `write_file` retained `_warning` | `writeContextWarning` | `writeContextWarningFold.test.ts`, `writeWarningIntegration.test.ts` |
| #175 | `patch` retained `_warning` | `patchContextWarning` | `patchContextWarningFold.test.ts`, `patchWarningIntegration.test.ts` |
| #161 | staged `memory` report | `memoryStagingReported` | `memoryStagedFold.test.ts` |
| #144 | patch lint error (replace and V4A) | `patchLintNeedsAttention`, `v4aLintNeedsAttention` | `patchLintFold.test.ts`, `v4aLintFold.test.ts` |
| #137 | terminal `environment_recreated` | `terminalRecreationNeedsAttention` | `terminalRecreatedFold.test.ts` |
| #127 | `delegate_task` iteration limit | `taskNeedsAttention` | `delegateFold.test.ts` |
| #116 | `web_extract` per-entry error | `webExtractNeedsAttention` | `webFold.test.ts` |
| #106 | search failure beside partial rows | `errorNotice` in `view/tools/cards/search.tsx` | `searchErrors.test.ts` |

`completedWorkAttention.test.ts` puts all nine signals in one completed turn, interleaved with
ordinary work. It checks that every signal is shown in order before the answer and that the
ordinary calls stay folded. It also covers the answer coming first, the same calls with no
signal (all folded), and replay from stored history.

## Each fixture fails without its guard

For each issue, the guard was replaced with `false` (for #106, the card's error notice was
disabled), and the issue's fixtures were run, then the source was restored. The two numbers are
the fixture result with the guard intact, then with it disabled.

| Issue | Focused fixtures | `completedWorkAttention.test.ts` |
|---|---|---|
| #188 | 4 passed → 2 failed, 2 passed | 4 passed → 2 failed, 2 passed |
| #181 | 6 passed → 3 failed, 3 passed | 4 passed → 2 failed, 2 passed |
| #175 | 5 passed → 3 failed, 2 passed | 4 passed → 2 failed, 2 passed |
| #161 | 4 passed → 2 failed, 2 passed | 4 passed → 3 failed, 1 passed |
| #144 | 10 passed → 6 failed, 4 passed | 4 passed → 2 failed, 2 passed |
| #137 | 8 passed → 6 failed, 2 passed | 4 passed → 2 failed, 2 passed |
| #127 | 5 passed → 4 failed, 1 passed | 4 passed → 3 failed, 1 passed |
| #116 | 7 passed → 5 failed, 2 passed | 4 passed → 3 failed, 1 passed |
| #106 | 7 passed → 7 failed | 4 passed → 1 failed, 3 passed |

Run them with `cd frontend && npx vitest run src/__tests__/<file>`.

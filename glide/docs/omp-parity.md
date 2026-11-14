# OMP parity qualification

Source baseline: `8d8ec3d8911c26da1ad15e07361d113dba70a0f4`, inspected 2026-11-14.
This matrix covers the OMP targets in the November 4 parity checkpoint, not every OMP capability.
A source file or a test definition does not prove native-client behavior.

## Source and test coverage

Paths below are relative to `frontend/`. All listed suites remain unrun in this qualification attempt.

| Target | Existing implementation or wiring | Synthetic suite |
| --- | --- | --- |
| Rewind and branch | `src/overlays/rewind.tsx`, `src/commands/session.ts` | `rewind.test.ts` |
| Conversation tree | `src/commands/local.ts:375-377` | `sessionTree.test.ts` |
| Context breakdown | `src/overlays/context.tsx` | `contextMeter.test.ts` |
| Named controls and agent tiles | `src/view/`, documented in `../FORK.md:65-70` | `a11y.test.ts`, `agentTiles.test.ts` |
| Composer dictation | `src/hermes/dictation.ts:40-66` | `dictation.test.ts`, `dictationKeys.test.ts` |
| Session info | `src/commands/local.ts:407`, `src/overlays/sessionInfo.tsx:51` | `sessionInfo.test.ts` |
| Ctrl+R history search | `src/app/actions.ts:226`, `src/overlays/historySearch.tsx:21-59` | `historySearch.test.ts` |
| Ask preview and code review | `src/__tests__/askPreview.test.ts`, `src/__tests__/codeReview.test.ts` define expected behavior | `askPreview.test.ts`, `codeReview.test.ts` |
| Intent boards | `../FORK.md:48`, `docs/openui.md` | `intentCards.test.ts` |
| Ephemeral-ui catalog | `src/vendor/ephemeral-ui/PIN.json:1-58`, 53 kinds at `c3b7b275521e125fc303b683fe5c752eabdfd5e2` | `euiCards.test.ts:35-43`, `euiApp.test.ts`, `euiOffline.test.ts:23-56` |
| Host-owned cards and approval events | `docs/eui-host.md:8-62`, `src/__tests__/euiHostApp.test.ts:38-70` | `euiHostCards.test.ts`, `euiHostApp.test.ts`, `euiKitHost.test.ts` |

## Reproduce the focused qualification

Use the existing fleet route, not the desktop. Follow `.github/workflows/checks.yml:100-157` to fetch the exact Hermes pin and install frozen dependencies.
Then run `bash glide/tools/verify-parity.sh` on that worker. The helper selects 18 existing suites without changing their assertions.
It uses synthetic component and app fixtures. It does not open a microphone or contact a model provider.
The offline suite checks all 53 kinds and rejects network access. The app suite tests stale native event rejection.
Those checks do not measure text layout or establish all-kind coverage in an ordinary Tern window.
Full frontend, Python, install, bundle, and native-client gates remain separate. Existing CI and `scripts/e2e-fresh-install.sh` provide those nonvisual checks.

## Qualification status

The November 14 fleet submission failed before admission because the configured Kueue API endpoint refused connections.
No focused suite, typecheck, bundle, Python suite, or fresh-install flow ran in this attempt.
Only shell syntax and static target-path checks can be reported locally. Native layout, installed source/bundle identity, and real-turn behavior remain unverified at this baseline.
The old release and catalog pins must not be represented as this source baseline.
[Catalog PR #153039](https://github.com/NousResearch/hermes-agent/pull/153039) was open on November 14. Its entry pinned `5421c70ae8527c470e7e33ba0f79ebc498acd407`, 67 commits after this baseline.
The PR description still named `4bc0b5f`. Qualification must identify the actual entry pin rather than reuse the older description's test claims.

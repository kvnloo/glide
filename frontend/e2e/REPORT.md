# Feature gate verification

W2 adds an inventory of 150 owner-visible entries and ten ordered journeys. All local slash command names in `commands/local.ts`, `control.ts`, `session.ts`, and `refused.ts` have inventory entry points. Fleet additions remain with their implementation owner.

## Final checks

The gate runs locally as a small Node check:

```sh
nice -n 10 node frontend/scripts/features-gate.mjs
nice -n 10 node --check frontend/scripts/features-gate.mjs
git diff --check
```

The inventory table is:

```text
features | with tests | with army pass
150 | 146 | 0
```

The CLI integration tests, focused strict TypeScript check, and repository ESLint rules ran off-host through `fleet-build --node mbp`. Job `fleet-mbp-e413ec62809244fa` exited 0. From the staged `frontend/` directory, the commands were:

```sh
node node_modules/vitest/vitest.mjs run src/__tests__/features-gate.test.ts
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict --noUncheckedIndexedAccess --noUnusedLocals --exactOptionalPropertyTypes --noPropertyAccessFromIndexSignature --module nodenext --target es2024 --skipLibCheck --types node src/__tests__/features-gate.test.ts
node node_modules/eslint/bin/eslint.js src/__tests__/features-gate.test.ts
```

All 31 tests passed. Each CLI case runs the actual script in a temporary Git repository, not a mocked Git adapter. Coverage includes schema failures, journey membership, real test declarations and paths, absent and corrupt base inventories, feature and reference removals, uncovered-count growth, malformed receipts, missing passes, and receipt invalidation after HEAD changes.

The narrowed fleet payload contained the test, gate, Vitest and TypeScript configs, package manifest, ESLint config, and legacy lint list. A temporary tool-only install used the repository's exact Vitest 4.1.10, TypeScript 6.0.3, Node types 22.20.1, ESLint 10.13.0, and typescript-eslint 8.72.0 versions. No Hermes code or GUI was needed.

## Test-first and setup results

The initial test-first command was `nice -n 10 node node_modules/vitest/vitest.mjs run src/__tests__/features-gate.test.ts` from `frontend/`. It exited 1 before the gate existed, with `MODULE_NOT_FOUND`. One grouped option test also exceeded the existing five-second limit; it was split into independent cases without raising that limit.

The first narrowed fleet install exited 1 because the full frontend manifest requires omitted Hermes sources. The later tool-only install removed that unrelated prerequisite. Another fleet run passed all 31 tests but its focused TypeScript command exited 1 with TS5112. Adding TypeScript 6's required `--ignoreConfig` flag fixed the command. The final fleet job above passed the tests, typecheck, and lint together.

## Remaining acceptance work

These inventory entries have no existing test references:

- `hill-climb-run`, the text-plugin result formatter.
- `hill-climb-stop-resume`, the STOP-file commands.
- `offload-reset`, the accounting reset command.
- `native-visual-route`, the optional native Tern route.

Existing tests are source coverage references, not new execution receipts for those features. No native Tern window, microphone, private profile, or live provider was exercised. No army receipts were created, and strict promotion remains blocked until every feature has a passing receipt for the exact promoted HEAD. The PR job intentionally runs the non-strict gate.

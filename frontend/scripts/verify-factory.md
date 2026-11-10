# Verify the Factory pane headlessly

From the repository root, run:

```sh
node frontend/scripts/verify-factory.mjs
```

The script creates a new `W1-proof-*` directory under `/mnt/zer0models/project-artifacts/content-factory/glide-factory-pane`. It prints the directory and the unique control socket. Expect `PASS: 17 checks`, exit 0, and `RECEIPT.md` after about 45 seconds. Each run uses a fresh directory and keeps earlier evidence.

To name the new output directory, use:

```sh
node frontend/scripts/verify-factory.mjs --out /mnt/zer0models/project-artifacts/content-factory/glide-factory-pane/W1-proof-example
```

The directory must not already exist. Run the script in a foreground shell session. It owns `tern serve` until `tern ctl --control SOCKET quit`, including cleanup after an assertion fails. On success, it first closes the App through local `/quit` and checks its actual process exit in `app-exit.json`. Never substitute an owner's control socket. The script does not open a desktop window.

## Local prerequisites

- Node 22 or newer, Python 3, Git, tar, and `tern` on `PATH`.
- Installed frontend dependencies, including esbuild and the pinned Tern SDK. No install or lockfile change occurs.
- Hermes sources at `frontend/.hermes-src`.
- The Python Factory plugin at `/mnt/zer0models/worktrees/fframestudio-factory/hermes-plugin`. Override with `FACTORY_PROOF_PLUGIN`.
- IntentService at `/mnt/zer0models/z0-wt/intent-service`. Override with `FACTORY_INTENT_SOURCE`.
- Validator Git checkout at `/mnt/zer0models/worktrees/aodl-pattern-templates`, containing commit `68231658f0ec0338464c0916a2329b9587444312`. Override with `FACTORY_AODL_SOURCE`.

The script extracts the pinned validator into the owned artifact directory. It downloads nothing. It follows Bun's installed dependency links when bundling the actual App.

## Evidence and limits

`result.json` lists the assertions and the Tern exit status. Screenshots and layout JSON are under `serve/`. Native trees, App state, stats, protocol traffic, gateway requests, backend answers, and exact control commands remain in the artifact directory. `launch.json` records isolation settings and source hashes.

The App and SDK are real. The gateway is an EventEmitter stand-in without Vitest imports. Its Factory `command.dispatch` permits only scoped `json suggest {}` requests. Each request invokes the actual Python plugin. Pending contracts use the canonical compiler and pinned validator with the synthetic model from `hermes-plugin/tests/test_intents.py`. All runs, workflows, profiles, and pending contracts are synthetic and isolated. The unavailable case uses the unmodified production adapter in a separate empty store.

No approval endpoint, approval record, prompt submission, GPU content render, or human approval attempt occurs. Tern uses its native wgpu renderer for UI screenshots. No owner compositor, live gateway, production store, or content-rendering service is driven.

Full E2E remains blocked by canonical machine-proposal provenance and review-existing support. This proof does not satisfy the requirement for a human AODL approval followed by a real render. Do not approve or execute the synthetic contracts.

## Recorded runs, 2026-11-10

All paths below are under `/mnt/zer0models/project-artifacts/content-factory/glide-factory-pane/`.

- `W1-proof-X0634T/RECEIPT.md`: final source and CSS, 17 checks passed. Script, actual App process, and Tern exit 0. App stderr is empty.
- `W1-proof-9HXMRY/RECEIPT.md`: earlier repeat before the final lifetime fixes, 17 checks passed. Script, actual App process, and Tern exit 0. App stderr is empty.
- `W1-proof-7TKQ90/RECEIPT.md`: 17 checks passed. Script, actual App process, and Tern exit 0. App stderr is empty. Shutdown uses local `/quit` before `ctl quit`.
- `W1-proof-J6ntk2/RECEIPT.md`: 15 UI checks passed, script and Tern exit 0. Observed poll interval: 10711 ms. A later cleanup audit found App stderr `write EIO` after Tern closed the PTY. This run does not prove clean App shutdown.
- `W1-proof-Jeeo56/RECEIPT.md`: unchanged-script repeat with the same 15 UI checks and post-quit App `write EIO`. The script now quits the App normally before quitting serve and requires a clean process exit.

These runs contain the following screenshots under `serve/`, with matching layout JSON. Their tree, state, and stats files are at the run root:

- `01-off-default.png`
- `02-pending-synthetic.png`
- `04-backend-unavailable.png`
- `05-native-closed.png`
- `06-slash-closed.png`

The pending store is `backend/synthetic/aodl/intent/synthetic-w1-proof/.pending/`. The production-adapter unavailable store is separate at `backend/unavailable/`.

Earlier failed attempts remain as diagnostic evidence. Each script exited 1; any started serve stopped with `ctl quit`:

| Run directory | Error | Harness correction |
| --- | --- | --- |
| `W1-proof-DUL1wl` | Owned control endpoint appeared after its 20-second deadline during concurrent full-suite resource pressure | Stopped that owned serve with `ctl quit`; reran verification serially |
| `W1-proof-XXkE1K` | Esbuild failed with 52 unresolved transitive imports, including `htmlparser2` and `css-select` | Follow installed Bun package links and add the frontend dependency directory to esbuild resolution |
| `W1-proof-iRXFPS` | SDK startup timed out; Tern logged `cannot load file ... /usr/bin/node ... binary file` | Start plain `serve`, then use `ready` and `run`; `-e` is first-argument-only |
| `W1-proof-t5XgBF` | Control reply `expected run <command>` | Quote the whole shell command as one scenario argument |
| `W1-proof-KA346s` | App exited with `FACTORY_PROOF_ROOT is required` | Pass the isolated App environment explicitly in the pane command |
| `W1-proof-z93lW3` | `Timed out: App normal shutdown before serve quits`; native editor consumed `Ctrl+d` | Use App's local `/quit` through the tested native input path |

`z0-guard desktop` returned usage exit 2 because this installation has no `desktop` subcommand. The skill's headless-only fallback was used. `serve.log` retains the native wgpu discrete-adapter warning; no software Vulkan ICD is installed. This is UI screenshot rendering, not a Factory GPU render.

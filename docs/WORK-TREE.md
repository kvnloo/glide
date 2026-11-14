# Live work tree

The work tree mounts below the composer when a turn starts. FILES follows file tools. FEATURES / TASKS shows the turn's todo hierarchy or the prompt's requested clauses. The card collapses into a receipt when the turn ends. Show work tree reopens both views.

## Data ownership

Gateway events already enter `Transcript` through `gateway/handlers/turn.ts`. The work tree reads that folded state, not a second event subscription.

`ToolCall.completedAt` records an explicit `tool.complete`. Turn-end cleanup does not set it. A file without that receipt remains unconfirmed, even if the transcript closes its tool as done. Explicit errors, cancellation, and partial results do not get success checks.

`TurnEntry.todos` records the turn's latest plan. An empty list clears the plan. Out-of-band `todo.updated` events update the live turn without rewriting settled tool cards. `currentTodos()` uses the same snapshot before its historical-call fallback.

Prompt clauses have no completion evidence. They stay marked requested. The card never infers task completion from prose, elapsed time, or file-tool success.

## Caller and module boundaries

`app/stores.ts` creates one `WorkTreeCard` per pane and disposes it with the other stores. `app/frame.ts` passes the transcript, current directory, renderer, and stylesheet sink to `WorkTreeCard.node()`. The resulting native node enters the existing below-composer slot.

- `glideui/workTree.ts` projects files, tasks, and the receipt. It builds host-owned `GlideDoc` slots.
- `glideui/workTreeCard.tsx` owns only tab and expansion state. It compiles three fixed programs once through the packaged glide/v1 adapter, binds current data, and calls the existing native card renderer.
- `transcript/store.ts` retains completion evidence and current todo snapshots at their existing event boundaries.

Tab and expansion actions carry a transcript lifetime and turn ID. The controller checks those identities against the live source before acting, including before the next frame. Session reset, reload, or a new live turn invalidates old controls.

File paths are labels, not links or filesystem authority. Commands and result prose do not become guessed file operations. The projection reuses existing tool-detail and bridge parsers. Patch headers identify multi-file operations. Explicit creation reports distinguish created files from writes with unknown creation status.

## Design decision

Two independent design passes compared transcript projection with a dedicated event ledger. A separate cross-judge scored projection with reducer additions 23/25, versus 13/25 for another ledger. All passes used the available model with different reasoning effort because Jev returned `no_key`.

Projection won because the transcript already owns session routing, turn identity, replay, and late results. The ledger proposal correctly identified two missing facts: explicit tool completion and out-of-band plans. Those facts now live in the reducer instead of another store. Its lifecycle edge cases became tests.

The accepted tradeoff is a scan of the current turn on each frame. The controller does not cache mutable event state. Unknown file creation and untracked request clauses remain explicit rather than getting invented success states.

The shared motion layer and subagent pane are unchanged. The work tree's own CSS adds a gold border pulse only to active mutation rows. Reduced motion disables that pulse. Read rows use dim theme ink, and settled results get checks.

## Verification artifacts

`frontend/src/__tests__/workTree.test.ts` covers file states, parallel edits, late results, partial results, nested plans, explicit clears, bridge calls, malformed parent edges, binding, expansion, and stale controls. Golden replays include the new dock card.

`glide/tools/work-tree-shots.mjs` drives the real App and SDK in an owned headless Tern process. Its synthetic gateway feeds normal tool and todo events. The verifier clicks native controls, captures desktop and phone layouts, toggles reduced motion, checks the receipt, and resets the transcript. No model requests or physical-display input are permitted by that fixture.

Capture files use the HEADLESS prefix because the shared studio is active for other workers. The proof uses separate configuration, HOME, daemon socket, and control socket. The real Tern renderer produces the PNGs and MP4.

# Expandable agents hub

## Plan

- [x] Ground the existing hub, gateway store, transcript reader, and native rendering.
- [x] Compare picker rows and a controlled tree inside the existing overlay.
- [x] Choose the tree without changing gateway ownership or the lane broker.
- [x] Implement and test expansion, context, and keyboard navigation.
- [x] Verify the built UI in isolated Tern, capture evidence, and run the CI mirror.

## Usage

`/agents`, the agents pill, and the subagent card open the existing hub.
Enter or a click toggles an agent. Right expands it, then selects its first child.
Left collapses it, then selects its parent. Up and Down visit visible nodes.
O opens the selected agent beside the chat. T retains the existing timeline.

## Existing flow

`openAgents` reads `Agents.all()`. The store folds gateway events and registry rows
into `Subagent` objects. `parentId` identifies children. `Agents.follow` uses the
existing `session.transcript` reader. `agentSteps` combines stored steps with the
current tool. No new endpoint or synthetic production state is needed.

## Shape and alternatives

The hub reducer owns expanded IDs and selection. A pure forest builder orders
nodes by parent identity, including missing parents and malformed cycles. A native
node builder renders each agent and its context inside the existing overlay.

The alternative was to retain the picker list and expand only its side preview.
That preserves the picker but cannot show context underneath each tree node.
The controlled tree is the base. It retains the existing timeline picker,
steering, stop confirmation, spawn pause, and beside-pane actions.

This comparison used one sequential reviewer because the configured design-runner
model IDs were unavailable. There was no independent cross-judge.

## Invariants

- Expansion belongs to this overlay, not gateway state.
- Hidden descendants are not keyboard targets.
- Context comes from the existing transcript and current tool, never invented activity.
- Expanded visible agents share the existing transcript poller and its session ticket.
- Collapsible regions keep stable native keys and animate height and opacity.
- Reduced motion disables those transitions.
- Fixtures use synthetic agent names, tasks, paths, and timestamps.

## Verification

Run `bash glide/tools/verify-agent-tree.sh` for focused behavior tests and project
guards. The seven selected files pass all 62 tests. Typecheck and lint pass;
the strict gate reports eight errors in three untouched files. Separate size and
suppression checks each report one untouched test file. The normal app bundle passes.

Run `python3 glide/tools/capture-agent-tree.py --out docs/images/agent-tree` for the
owned offscreen Tern capture, labelled HEADLESS. This avoids restarting shared
studio services or touching the desktop. It exercises the app's overlay, not
reconstructed HTML. Captures are under `docs/images/agent-tree/serve/`; the script validates their
existence before reporting success and also exercises reduced motion.

Full suites run through the fleet-runner CI mirror, not local full Vitest. The PR
records the final run and its failures. The fork-layout gate includes new feature
files outside `glide/`; this change does not expand its historical allowlist.

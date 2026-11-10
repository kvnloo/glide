# Factory pane

`/factory` toggles a native, nonmodal Tern aside. It starts closed and does not read Factory data until opened. It replaces the Session or PR aside, without taking the composer's focus.

The pane shows failed runs, finished runs awaiting review, and canonical action proposals. Running jobs occupy one count line. Ready jobs appear only through proposals. With no review-completion marker in the backend, finished runs remain awaiting review.

One single-flight poll runs at least ten seconds apart while open. Closing stops reads. Reopening cannot bypass the minimum interval. Session changes invalidate replies and native callbacks. Routine progress and polling errors create no chat cards or toasts.

## Text commands

`/factory text` and `/factory status` show the plugin's original text output. Bare `/factory` falls back to text on terminals without the `aside` feature. These commands do not require the ephemeral-ui kit.

- `/factory runs` lists recent results.
- `/factory scenes WORDS` searches reference scenes.
- `/factory suggest` requests canonical proposals.
- `/factory render RUN CONTRACT_ID` asks the backend to execute an already approved, matching intent. The command is not approval.

## AODL integration is blocked

The current canonical IntentService compiler records sources as OMP root-user history. It cannot represent a Factory machine proposal without falsely attributing that proposal to a user. The production adapter therefore refuses to create a contract. The pane shows the unavailable reason, not a placeholder ID.

The documented OMP `/aodl` command compiles an ask. It cannot open an existing Factory contract by ID. Pending rows therefore show `AODL review unavailable`; there is no invented review link or alternate approval button.

No frontend approval record exists. The shared backend render gate requires the immutable canonical approved document and matching session, action, run, workflow state, revision, and hashes. It rejects pending, rejected, changed, superseded, or already claimed intents. Synthetic tests exercise canonical pending documents and decisions in temporary stores only.

Backend storage uses `FACTORY_DATA_DIR`, otherwise the host's `ctx.state.data_dir`. IntentService receives that directory's `aodl` subdirectory and stores contracts beneath `aodl/intent/SESSION/`. See the backend's `hermes-plugin/README.md` for dependencies and storage details.

## Verification

From `frontend/`, run:

```sh
HERMES_SRC=/home/kvn/.hermes/hermes-agent ~/.bun/bin/bun run test -- src/__tests__/factoryCommand.test.ts src/__tests__/factoryPane.test.ts src/__tests__/factoryApp.test.ts src/__tests__/sidebar.test.ts src/__tests__/actionsSplit.test.ts src/__tests__/dockModel.test.ts src/__tests__/sessionLifecycle.test.ts src/__tests__/glideCommand.test.ts src/__tests__/appDispose.test.ts src/__tests__/a11y.test.ts src/__tests__/styles.test.ts
bun run lint
bun run typecheck
```

From the repository root, run `node frontend/scripts/verify-factory.mjs` for an owned headless native proof. The harness uses the actual App, SDK, plugin, compiler, and validator with a synthetic gateway and proposal model. It never approves or renders content. See [the proof instructions](../scripts/verify-factory.md).

A human-reviewed AODL contract followed by a render is not proven. Canonical machine-proposal provenance and identity-preserving review-existing support are prerequisites. Do not treat the synthetic proof as a completed production workflow.

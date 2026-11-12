# Owner journeys

This is the army's test map for `features.json`. Each numbered item is a feature ID in execution order. A shared setup may be reused, but each receipt names one feature and the exact tested commit. Existing test references are not army passes or proof of native Tern behavior.

The ten journeys cover the shipped checkout. Fleet cards and fleet commands are added by their implementation owner. Native GUI checks require an owned isolated headless display. A blocked integration passes only when its refusal is visible and no unauthorized action occurs.

Run the inventory check from the repository root:

```sh
node frontend/scripts/features-gate.mjs
```

The default comparison is `origin/main`. Fetch that ref first. `--base-ref REF` selects another existing base. Only an absent inventory skips the comparison. Removing a feature or one of its test references requires `removed: [{"id":"feature-id","reason":"specific reason"}]` in the inventory. A reason never permits the number of features with no tests to increase. A retained feature ID can carry a removal reason when replacing a test reference.

Before promotion, supply external JSON receipts, one object per file or an array of objects. Subdirectories are read recursively:

```json
{"feature":"feature-id","sha":"FULL_40_CHARACTER_HEAD_SHA","verdict":"pass"}
```

```sh
node frontend/scripts/features-gate.mjs --strict --receipts /absolute/receipt-directory
```

Only `pass` for `git rev-parse HEAD` counts. Missing, failed, stale, malformed, or unknown-feature evidence cannot fill a missing pass. Inline `army` values do not authorize promotion. PR CI runs the non-strict check and does not claim these receipts exist.

## install

Install and send the first message. Install the plugin, launch it in Tern, and send a prompt. Restart the pane to check continuation, then try a slash completion.

1. `install-plugin`
2. `tern-launch`
3. `glide-launch`
4. `chat-send`
5. `slash-completion`
6. `pane-auto-resume`
7. `connection-surface-recovery`
8. `glide-onboard-cli`
9. `frontend-channels`

## memory

Build corrections memory and try local offload. Inspect this machine. Approve each memory write, check a matching correction, and turn quoting off again. Try the separate catalog, benchmark, and offload steps only when their dependencies exist. Text-plugin commands below run outside the native Tern /glide interceptor.

1. `glide-detect`
2. `memory-build`
3. `memory-enable`
4. `memory-hook`
5. `memory-recall`
6. `memory-disable`
7. `glide-setup`
8. `glide-json-fallback`
9. `router-card`
10. `router-install`
11. `router-list`
12. `router-rank`
13. `hill-climb-card`
14. `hill-climb-scaffold`
15. `hill-climb-run`
16. `hill-climb-status`
17. `hill-climb-stop-resume`
18. `offload-card`
19. `offload-models`
20. `offload-task`
21. `offload-savings`
22. `offload-reset`

## focus-voice

Protect a focus block and talk beside helper lanes. Start a block, hold a non-critical ask, let a critical ask through, then end the block and read the digest. Save a wind-down note. Dictate into an unsent draft before trying a consented live call and its helper lanes.

1. `focus-status`
2. `focus-hours`
3. `focus-start`
4. `focus-route`
5. `focus-stop`
6. `focus-wind-down`
7. `focus-morning-resume`
8. `voice-dictation`
9. `live-voice-toggle`
10. `live-voice-consent`
11. `live-voice-controls`
12. `talk-call`
13. `hold-to-talk-unavailable`
14. `voice-lane-strip`
15. `voice-lanes-popup`
16. `thinking-orb`
17. `focus-orbit`

## taste-intent

Brainstorm in Taste and inspect an intent. Open a local Taste board beside chat. Declare an ask, inspect its unevidenced contract, and advance to the explicitly synthetic work rail. Open the council popup and check its live or demo label.

1. `taste-pane`
2. `intent-declare`
3. `intent-contract`
4. `intent-work-preview`
5. `council-popup`
6. `council-card`

## factory

Review Factory work without inventing approval. Open the optional aside, inspect runs and scene references, and request proposals. Verify that missing canonical provenance blocks review and render instead of manufacturing a contract.

1. `factory-pane`
2. `factory-text-status`
3. `factory-runs`
4. `factory-scenes`
5. `factory-suggest`
6. `factory-render`
7. `factory-review-blocked`

## cards

Read cards, artifacts, and prepared previews in chat. Read ordinary and host-owned cards. Check one-use approvals and missing offline data. Prepare scoped previews explicitly, attach an image, inspect tool results and charts, and answer a gateway prompt.

1. `ephemeral-chat-cards`
2. `host-card-approval`
3. `cards-offline`
4. `visual-picker`
5. `prepare-openui`
6. `prepare-intent-board`
7. `prepare-architecture`
8. `prepare-card-preview`
9. `native-visual-route`
10. `image-attachments`
11. `artifact-links`
12. `written-media`
13. `lsp-results`
14. `lsp-edit-diagnostics`
15. `tool-cards`
16. `table-charts`
17. `tool-results-sheet`
18. `gateway-prompts`

## sessions

Review a pull request and continue another session. Start a named conversation, inspect its sidebar and linked PR, review a changed line into the draft, then fork or rewind. Resume a stored session and check its context before saving or restoring a checkpoint.

1. `new-session`
2. `session-picker`
3. `session-sidebar`
4. `pull-requests`
5. `pr-link-tools`
6. `working-changes`
7. `code-review-note`
8. `fork-pane`
9. `rewind-picker`
10. `branch-tree`
11. `undo-turns`
12. `retry-turn`
13. `compress-context`
14. `branch-session`
15. `save-session`
16. `rollback-checkpoint`
17. `context-snapshot`
18. `session-info`
19. `transcript-history-pages`

## control

Supervise work while keeping the main draft. Inspect subagents and background jobs. Queue and steer work, ask a side question, then inspect reports. Do not treat unsupported side-thread or inventory APIs as empty successful results.

1. `agents-hub`
2. `agents-spawn-gate`
3. `agent-watch`
4. `background-processes`
5. `cron-jobs`
6. `prompt-queue`
7. `queue-edit-steer`
8. `steer-turn`
9. `stop-turn-processes`
10. `background-question`
11. `btw-threads`
12. `btw-notices`
13. `goal-loop-controls`
14. `retained-notices`
15. `session-reports`
16. `tools-inventory`
17. `mcp-reports`
18. `ssh-report`
19. `background-live-charts`

## settings

Change the owning profile and composer. Inspect native settings, choose a session model, compare effort and fast mode, and change the palette. Try profile-owned bindings, Vim, external editing, history search, and copying without sending the draft.

1. `native-settings`
2. `model-hub`
3. `model-picker`
4. `model-cycle`
5. `reasoning-effort`
6. `fast-mode`
7. `theme-picker`
8. `hermes-skin`
9. `wallpaper-theme`
10. `wallpaper-default`
11. `wallpaper-export`
12. `profile-keybindings`
13. `vim-composer`
14. `external-editor`
15. `composer-readline`
16. `prompt-history-search`
17. `copy-text`

## maintenance

Find commands and inspect integrations. Use the palette and help, inspect configuration and installed plugins, then manage a consented browser block. Reload supported integrations or inspect worktrees and snapshots. Check explicit refusals for unavailable commands and gateway methods.

1. `command-palette`
2. `help-bindings`
3. `config-command`
4. `plugins-list`
5. `subscription-report`
6. `browser-manage`
7. `browser-blocks`
8. `reload-integrations`
9. `worktree-command`
10. `snapshot-create`
11. `update-split`
12. `unsupported-commands`
13. `plan-review-boundary`
14. `table-gateway-boundary`
15. `media-preview-gateway`
16. `quit-chat`


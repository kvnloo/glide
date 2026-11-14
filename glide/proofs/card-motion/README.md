# Native card motion proof

The images and MP4 show the real `glide/v1` renderer in Tern on the isolated studio Sway display. All card data is synthetic. The capture does not use Kevin's desktop.

- `entrance.png`: figures count up after the outline appears.
- `live.png`: final values with the running-state marker and meter shimmer.
- `done.png`: terminal state with idle motion removed, without a second entrance.
- `other-parts.png`: table, key-value rows, checklist, flow, tabs, badges, and a literal-ink SVG.
- `reduced.png`: reduced-motion mode with final values shown immediately.
- `motion.mp4`: entrance, idle motion, and completion in one continuous native recording.

To repeat the capture on the configured studio, run this command from the worktree root:

```sh
python3 frontend/e2e/capture-card-motion.py
```

The driver takes `/tmp/glide-studio-heavy.lock`, waits for more than 6 GiB of available memory, and creates its own Tern tab. It records only the `so.stencil.tern` window on the studio display. It stops its recorder, closes its tab, and restores normal motion after the test.

Run the focused tests from `frontend/`:

```sh
./node_modules/.bin/vitest run src/__tests__/glideMotion.test.ts src/__tests__/glideWidgets.test.ts src/__tests__/glideUiTokens.test.ts src/__tests__/euiCards.test.ts src/__tests__/euiHostCards.test.ts
node scripts/typecheck.mjs
node scripts/lint.mjs
TSP_OUT=../artifacts/card-motion/entry.js bun run bundle
```

The first mirror run, [43569789816](https://github.com/kvnloo/fleet-runner/actions/runs/43569789816), checked implementation commit `094f0955ff2005a7befd9a6c4954265f8a00168b`. Its frontend job passed 2,872 tests, with five skipped and one todo, and built the bundle. The full run was red because of layout-baseline drift, existing size violations in `src/app/chat.ts` and `src/__tests__/glideCommand.test.ts`, and three Python registration or documentation tests. The PR links the final-head mirror run separately.

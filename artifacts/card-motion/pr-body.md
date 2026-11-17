## Changes

- Add one shared native `glide/v1` motion sheet. The outline enters first, then figures count up, bars grow, and rows stagger over 600–680 ms using `cubic-bezier(0.45,0,0.1,1)`.
- Idle motion follows running or pending cards and active steps. Terminal card state wins over stale active children. Host revisions keep stale-click protection without replaying entrance.
- Reduced motion shows final values immediately. No animation timers run on the server. Focus widgets now publish their actual running or done state.
- Add typed fixtures for every native part, focused regressions, and a repeatable isolated Tern capture driver. Live-tree and subagents files are untouched.

## Verification

- Focused Vitest: 65 passed across five files, exit 0.
- `node scripts/typecheck.mjs`: exit 0. Two diagnostics inside the pinned Hermes dependency are left to Hermes by the existing checker.
- `node scripts/lint.mjs`: zero errors, exit 0.
- `TSP_OUT=../artifacts/card-motion/entry.js bun run bundle`: exit 0. The checked-in bundle is untouched.
- Real Tern on isolated headless Sway: count-up, live, completed, other native parts, and reduced-motion captures. Synthetic data only. The driver holds the shared studio lock and checks available memory.
- Initial [fleet-runner mirror](https://github.com/kvnloo/fleet-runner/actions/runs/43569789816): frontend passed 2,872 tests and built the bundle. The full mirror remains red on unrelated layout drift, two pre-existing size violations, and three Python registration or documentation tests. This branch registers only its own new frontend paths in the existing layout allowlist.

Final-head mirror: [43571966370](https://github.com/kvnloo/fleet-runner/actions/runs/43571966370), checking signed commit `88c574649c1df7adbccf24d05df99e9508524580`. Frontend passed typecheck, 2,872 tests (five skipped, one todo), and bundle build. The bundle-untouched gate also passed. The full run failed with exit 1 in three unrelated jobs: 27 pre-existing layout-baseline omissions, `glideCommand.test.ts` at 630/600 lines and `chat.ts` at 601/600 lines, and three Python failures (323 passed).

The capture driver temporarily makes Tern opaque so the studio's film wallpaper cannot tint the video, then restores the configured opacity.

## Native stills

![Entrance](https://raw.githubusercontent.com/kvnloo/glide/feat/card-motion/glide/proofs/card-motion/entrance.png)

![Live card](https://raw.githubusercontent.com/kvnloo/glide/feat/card-motion/glide/proofs/card-motion/live.png)

[Continuous native MP4](https://github.com/kvnloo/glide/raw/refs/heads/feat/card-motion/glide/proofs/card-motion/motion.mp4) · [Repeat the proof](https://github.com/kvnloo/glide/blob/feat/card-motion/glide/proofs/card-motion/README.md)

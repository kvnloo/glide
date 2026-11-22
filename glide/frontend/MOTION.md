# Glide finite motion

[Dash's motion contract](https://github.com/kvnloo/dash/blob/166998f34f618347aace23289820e8ce35ace76d/MOTION.md)
defines the z0 timings. `motion.ts` carries both timing columns; `fade` also
serves as crossfade. Vitest compares the constants to a verbatim excerpt of the
pinned table, without network access. Update the source pin, excerpt and
constants together when adopting a new contract.

- **Card entrance:** reveal rows together, without a stagger. Numeric reveals
  finish within the same enter budget and never affect the accessible value.
- **Work disclosure:** use the critical curve for spatial travel. With reduced
  motion, the chevron rotates immediately and opacity still transitions.
- **Reduced motion in cards:** show final values and bar sizes immediately;
  retain the opacity entrance. Live-card ambient loops are separate and do not
  run under reduced motion.

These surfaces use the normal column. Dash's Turbo numbers are preserved as
explicit presets, not derived from (or a replacement for) the shared
ephemeral-ui theme speed and turbo multipliers. Hermes's model-routing Turbo
is not a UI motion preference.

# Council exchange

`/council` opens the existing council popup. Enter convenes the recorded exchange. `/council card` publishes its transcript entry.

The brief and optional constraints type onto the card. One envelope travels to each seat. Each seat shows received, thinking, drafting, and done states. Recorded turns control those states. Replies then converge into a report containing the verdict, agreements, dissent, abstentions, and citation receipts.

The endpoint still supplies a complete `glide.council-run/v1` snapshot. This view does not dispatch agents or invent their replies. The demo remains labelled DEMO. A snapshot can include `constraints`, an optional list of up to eight strings.

## Read aloud

Select Read aloud before convening. The popup reads the brief and constraints, then the completed report. R toggles this mode. M toggles mute from the card.

The local platform path uses `espeak-ng` or `espeak` for synthesis and `paplay` for playback. These executables must be on PATH. The existing frontend voice command supports dictation, not spoken replies, so the council does not reuse its microphone or start a Hermes Talk session.

During confirmed playback, a full-pane thinking orb replaces the card. Measured PCM amplitude controls its scale and ink. One sentence appears as a caption. Any key or a click returns to the card and cancels that reading. Escape returns first, then closes the popup on a second press. Replay, mute, close, and replacement cancel owned speech processes and timers.

Tern's reduced-motion capability disables typing, flight, orb motion, and fades. Seat states and the report remain available. Missing synthesis or playback shows a warning and leaves the text exchange usable.

The current SDK does not expose wheel or pointer-move events. Looking at the screen or scrolling cannot return to the card. Keys and clicks can.

## Verification

Run focused behavior checks from `frontend/`:

```sh
bun run test src/__tests__/glideCommand.test.ts src/__tests__/talkNative.test.ts src/__tests__/glideWidgets.test.ts src/__tests__/designTokens.test.ts
bun run typecheck
bun run lint
```

The nine added tests cover the exchange projection, constraints, receipt provenance, reduced motion, PCM samples, and speech lifecycle. The full suites run through the fleet-runner CI mirror, not local Vitest.

`glide/tools/council-native.mts` runs the production popup in a native Tern pane without a model or gateway. `glide/tools/council-capture.py OUT_DIR STUDIO_DIR SWAYMSG` captures that pane on an existing headless studio. The capture tool takes the shared heavy lock, waits for more than 6 GiB of available memory, and sends speech to a dedicated null sink. It never uses the live desktop or speakers.

# Council exchange work plan

- [x] Ground: trace `/council` through `councilCommand`, `openCouncilPopup`, `councilCard`, `euiPopupNode`, and native Tern nodes. Runs are parsed snapshots, not an agent dispatch API. `/voice tts` explicitly has no spoken replies. `orbSvg` owns the reusable thinking-orbs renderer.
- [x] Sketch: compare two designs below.
- [x] Agree: autonomous implementation, no owner decision required.
- [x] Implement: failing behavior tests, pure exchange projection, popup controls and platform speech.
- [ ] Verify: focused tests, typecheck, lint, isolated native capture, CI mirror.
- [ ] Deliver: signed commit, branch push, PR with evidence. Do not merge.

## Usage and shape

The existing caller still uses `openCouncilPopup(host, source, clock)`. An optional fourth argument supplies speech and reduced-motion capabilities for deterministic tests. `councilCard(source, {t: elapsed})` draws the same popup/card with a typed brief, receipt chips, existing instrument, and clause report. `exchangeAt(run, elapsed, reduce)` derives all visible phases and the original instrument frame from one clock. `CouncilSpeech.speak(sentence, signal, playing)` reports PCM amplitude samples when the player starts and resolves when playback ends. Its abort signal cancels playback. No agent requests or verdicts are invented.

## Alternatives and synthesis

A: add independent timeout chains for brief typing, seat delivery, report assembly, and speech inside the popup. This has the smallest initial edit but exposes timing coordination and cancellation in every callback.

B: derive visual state from elapsed time, retaining the existing event schedule as the working phase. One popup-owned speech queue consumes the brief/report sentences. This hides phase timing in one pure function and makes seek/replay/reduced-motion testable.

Choose B. Keep A's direct integration into the existing popup rather than adding a second council controller. Reject independent timers because replay and close would need coordinated cleanup across chains. Speech completion controls the brief-to-working handoff, so long speech does not skip the exchange. Key or pointer interaction returns to the card and cancels the current reading. A mute toggle prevents subsequent speech.

The named Claude runners and `spawn_agent` API in the architect/arena skills are not available in this runtime. The design comparison therefore uses a sequential local pass, with reduced model diversity. No external model calls are needed.

## Accepted limits

- The endpoint returns a snapshot. Received/thinking/drafting/done describe its replay, not a new remote dispatch.
- Native platform speech requires a supported local speech engine and player. Unavailable speech must show an actionable notice, never a fake speaking state.
- No cleanOrbSvg or shared card-motion layer exists in this checkout. Import the existing orb renderer. Do not edit another worker's files.

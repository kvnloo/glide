# Round 2: design-intent ideas (film and app motion rules)

GL-072 · tracks the film plan in [#346](https://github.com/kvnloo/glide/issues/346). This is the merged
round-2 list: one rule set for how Glide moves in Tern and one for how the launch film moves. Every
idea names its sources as `path:line` at `6c1e677` (main after #367) or as an issue link.

## How this list was made

- **Round 1.** `ROUND1-ALL.md` (9 lanes, about 45 KB) is not on any public branch of this repo. All
  origin branches and the issue search were checked, and the file lives on the render host. Its ideas
  are therefore not quoted here. To fold them in, diff its headings against the IDs below. Every ID
  is stable, so a round-1 idea either maps onto one of them or becomes a new row.
- **Round 2.** Only 2 of the 9 lanes had run, and their output isn't public either. All nine
  perspectives were re-run against the code and #346, so this list stands alone:

| # | Perspective | Asks |
|---|---|---|
| P1 | Film director | What moves on camera, when, and why? |
| P2 | Motion designer | Curves, a duration ladder, stagger, entrance, idle and exit. |
| P3 | Accessibility | Reduced motion, screen readers, contrast while things move. |
| P4 | omp/Tern parity | Does Glide move like a native omp surface or like a guest overlay? |
| P5 | Brand and light | When gold may move, and who may glow. |
| P6 | State and feedback | Does every motion mean a state change? |
| P7 | Agent as designer | Guardrails for widgets, pages and restyles made by the agent. |
| P8 | Phone and performance | 412 px, motion cost, frame cadence. |
| P9 | Critic (hill climb) | Contradictions and rules that have no check. |

- **Hill climb.** Each perspective proposed ideas, and P9 then attacked them. Ideas that clashed were
  merged into one rule. Conflicts only Kevin can settle are listed under "Decisions" with a default
  that can be undone. The "Next PRs" section ranks the rules by impact over cost.

Shorthand below: `motion.tsx` is `frontend/src/glideui/motion.tsx`. "Gap audit" is
[#346 comment 7014511170](https://github.com/kvnloo/glide/issues/346#issuecomment-7014511170). "Take
notes" is [#346 comment 7015646024](https://github.com/kvnloo/glide/issues/346#issuecomment-7015646024).

## The one idea

**Motion is state, on one clock, in one hand.** Something moves only when its state changes or while
it is live. Every loop shares the orb's 9.6 s cycle. Only the host's sheet animates. The film is this
same app, recorded: it gets no motion the app doesn't have, apart from the title cards.

## A. App motion rules

| ID | Rule | Why | Check | Sources | From |
|---|---|---|---|---|---|
| M1 | **Motion means state.** An element may animate on entrance, on a state change, or while it is live. Terminal states settle in place, with no second entrance. Idle loops stop when the card stops being live. | Rubric #8 says state shows as motion. The card-motion proof already removes idle motion on done. Hover lift and rim shimmer are the only exceptions; they are affordances (M14). | Vitest: render a card running → done and assert no `data-glide-enter='yes'` on the second render and no `[data-glide-motion='live']`. | `docs/DESIGN-LANGUAGE.md:21`, `motion.tsx:41-52` (`liveCard`), `glide/proofs/card-motion/README.md:8` | P6, P2 |
| M2 | **Two curves, as tokens.** `settle` = `cubic-bezier(0.45,0,0.1,1)` for entrances and state changes. `press` = `cubic-bezier(.2,.7,.2,1)` for hover and press. Physical motion (the orbit brake) keeps its derived curve. The keyword `ease*` values and the kit's overshoot map onto `settle`. | Today there are at least five curves plus the keyword eases, so cards that sit side by side land differently. | Export `MOTION.ease` from `glide/frontend/tokens.ts` and extend `tokenDrift` to flag any `cubic-bezier(` or bare `ease` that isn't a token. | `motion.tsx:75`, `glide/frontend/glass.ts:137`, `frontend/src/voice/orbitTargets.ts:24`, `glide/frontend/sandboxMotion.mjs:30`, `glide/frontend/intentCards.ts:297-298`, `frontend/src/agents/treeView.tsx:90` | P2, P9 |
| M3 | **A duration ladder: 80 · 180 · 480 · 900 ms.** 80 for press, 180 for a shell or outline, 480 for a content reveal, 900 for a hand-off (a number rolling over, a tile landing, a brief being delivered). Stagger is 10 ms a row and stops at 200 ms. | About 17 distinct durations exist today (120, 150, 160, 180, 200, 250, 300, 480, 500, 600, 700, 900 ms, 1 s and others). The card sheet already uses 180/480 and the 200 ms stagger cap. | `tokenDrift` flags any `animation`/`transition` duration that isn't on the ladder or a loop period (M4). | `motion.tsx:77-83`, `glide/frontend/glass.ts:200`, `glide/frontend/attentionCards.ts:142`, `glide/frontend/intentCards.ts:297-298`, `glide/frontend/councilExchange.ts:5` | P2 |
| M4 | **One clock for loops: the orb's 9.6 s.** Every infinite loop uses a period that divides 9.6 s (1.2, 2.4, 4.8 or 9.6 s). "Running" uses 2.4 s everywhere. | Running pulses use 1.2, 1.4, 1.6, 1.8 (alternating, so 3.6), 2.8, 4.2 and 3.2 s. Two live cards side by side beat against each other, and a film loop can't be cut cleanly. On one clock, a 9.6 s span (576 frames at 60 fps) loops with no seam. | A unit test parses every `infinite` animation in the host sheets and asserts `9.6 / period` is an integer. | `frontend/src/chrome/orb.ts:158`, `frontend/src/voice/cleanFocus.tsx:76-79`, `glide/frontend/intentCards.ts:235,286`, `glide/frontend/attentionCards.ts:131`, `frontend/src/glideui/workTreeCard.tsx:120`, `frontend/src/view/styles.ts:233`, `motion.tsx:90-93` | P2, P1, P9 |
| M5 | **The host owns motion.** Agent widget markup may not animate or glow (already enforced). A Page may animate, but only inside its own pane and only if it honours reduced motion (M7). An agent restyle (`glide_ui_style`) changes tokens; the host decides how that change moves (M6). | Agent UI stays intentional because it can't invent motion. The rule already exists for widgets but is not written down for Pages or restyles. | Keep the `checks.ts` test. Add a `glide/tests/test_ui.py` case per M7. | `frontend/src/glideui/checks.ts:14,24`, `motion.tsx:73`, `glide/pages/README.md:7-14`, `glide/ui.py:105-115` | P7 |
| M6 | **A restyle is one 480 ms token cross-fade, never a snap or a re-entrance.** When `glide_ui_style` or a theme flip changes `--glide-*`, the colours cross-fade on `settle`. Cards keep their place and don't re-enter. | No transition is defined on restyle today (`glide/frontend/style.ts` and `themes.ts` contain no `transition`), so a restyle snaps. The film's 50–56 s beat is a restyle; a host-owned cross-fade makes it read as one intentional change. | Fixture proof: shoot the frame before, at 240 ms and after a `glide_ui_style warmth` change. Assert the midpoint ink lies between the two and that the card count is unchanged. | `glide/ui.py:105-107`, `glide/frontend/style.ts`, `glide/frontend/themes.ts`, [#346 beat table](https://github.com/kvnloo/glide/issues/346) (50–56 s) | P7, P1, P5 |
| M7 | **One reduced-motion source, applied live.** Every surface honours both the CSS media query and Tern's `caps.reduceMotion`, and follows the `motion` event without needing a reopen. Under reduce: final values show at once, loops hold one still frame, and position and scale tweens are dropped. | Card CSS uses the media query; frame-driven views read caps. `chat.ts` forwards a live `motion` change only to the orb and lanes. Clean focus and the council popup read it once, when they open (found by reading the code, not by a run). `piano.html` has no reduced-motion path at all (`grep -c prefers-reduced-motion` is 0), while `night-drive.html` has one. | (a) A Vitest case: emit `{ev:'motion',reduce:true}` with clean focus and the council open, and assert both stop. (b) `test_ui.py`: any page that calls `requestAnimationFrame` must contain `prefers-reduced-motion`. | `frontend/src/app/chat.ts:455-458`, `frontend/src/voice/cleanFocus.tsx:179`, `glide/frontend/councilPopup.ts:210`, `glide/pages/piano.html:469`, `glide/pages/night-drive.html:319`, `motion.tsx:104` | P3, P9 |
| M8 | **Count only one figure; announce only the final value.** Count-up is limited to a single formatted number. Clocks, ranges, versions and prose never count. The final value holds the layout and is the only text screen readers see. | This rule already exists in code. Writing it down keeps the council, Pages and new cards from adding tickers that read as noise. | Keep the `countFrames` whitelist tests. Assert `aria-hidden` on every `.glide-count-frame`. | `motion.tsx:23-39` (`countFrames`), `motion.tsx:54-62` (`figure`), `frontend/src/__tests__/glideMotion.test.ts:70` | P3, P6 |
| M9 | **Gold moves only for the one live thing the user is waiting on.** At most one moving gold element per pane: the composer streak while a turn runs, or the focus ring during a block. Card-level "running" markers (the tick dot, the work-tree pulse) move in cream ink. | §3 says gold never marks "running", yet three loops animate gold for running. One moving gold element keeps "where do I look" unambiguous. See D1. | Pixel check in `tern_rubric.py`: across two frames 600 ms apart, at most one connected region of saturated gold changes. | `docs/DESIGN-LANGUAGE.md:39`, `frontend/src/view/styles.ts:217-233`, `motion.tsx:93`, `frontend/src/glideui/workTreeCard.tsx:120`, `glide/docs/WORK-TREE.md:35` | P5, P9 |
| M10 | **Glow belongs to the ring alone (and the glass demo).** Change rubric #5 to "Only the focus ring and the `/glide glass` demo may glow". Keep the ring's glow on by default and `glow:false` for a bare stroke. | The rubric bans glow outside the demo, while the owner rule and the code give the ring a default glow. Two rules that disagree are not a design intent. See D2. | `tern_rubric.py` R10 stays strict for cards. Add a ring case that expects glow only in the `composer-ring` slot. | `docs/DESIGN-LANGUAGE.md:18`, `frontend/src/voice/cleanFocus.tsx:4`, `frontend/docs/voice.md:56`, `glide/ui.py:63,197` | P5, P9 |
| M11 | **Loops animate only compositor-cheap properties.** Infinite loops use `opacity` and `transform` only. One-shot expands may tween `height` once. | The composer streak loops `background-position` and the work-tree pulse loops `border-left-color`; both repaint on every frame of a long turn. On a phone and in the CSS-budgeted native surface that cost is paid all turn. | `tokenDrift`-style scan: inside `@keyframes` used by an `infinite` animation, only `opacity`/`transform` may appear. | `frontend/src/view/styles.ts:217-233`, `frontend/src/glideui/workTreeCard.tsx:120-121`, `frontend/src/agents/treeView.tsx:90`, commit `7236d66` (surface CSS budget, #358) | P8 |
| M12 | **Motion stays inside the card at 412 px.** No entrance translates more than 3 px, and no overshoot crosses the card edge (R07). The staggered reveal ends by 200 ms whatever the row count, so tall phone cards don't trickle in. | Today's reveal is 3 px and the stagger is capped, so this is a rule to keep. The kit's overshoot curve (`1.18`) would break R07 in a narrow column. | Add 412 px frames at 0, 120 and 300 ms to the card-motion shot script; R07 must pass on each. | `motion.tsx:80-81,96`, `glide/frontend/sandboxMotion.mjs:30`, `docs/DESIGN-LANGUAGE.md:22`, `docs/DESIGN-LANGUAGE.md` §7 R07 | P8, P4 |
| M13 | **Defer to Tern for chrome motion.** Tabs, splits, the palette, the dock and native controls (`ask_control`, #365) move the way Tern moves them. Glide adds motion only inside its own cards and panes. | This is the "Tern draws" principle in docs/spec.md. omp parity means Glide's own chrome shouldn't move differently from omp's next to it. | Native check: record omp and Glide opening the same palette or control in Tern at 60 fps; the frame counts from first change to settle should match within ±2. | `docs/spec.md:20-21`, PR #365 (`782e29e`), PR #358 (`a727a99`) | P4 |
| M14 | **Hover and press stay implied.** Hover lifts are at most 1 px with the rim shimmer as the only light change; press is `scale(.97)` for 80 ms. Neither exists under reduced motion. | Rubric #8 says "implied". glass.ts already does this; writing it down stops new surfaces adding big hover effects. | Already covered by the glass.ts reduce block. Add a drift test for any `:hover{transform:` larger than 1 px. | `glide/frontend/glass.ts:183,200-205`, `docs/DESIGN-LANGUAGE.md:21` | P2, P4 |

## B. Film motion rules (launch film, #346)

| ID | Rule | Why | Check | Sources | From |
|---|---|---|---|---|---|
| F1 | **The film is the app, recorded.** Each beat is one real take, and all UI motion in it plays at 1× from the app (M1–M14). The editor adds no motion except the fframes title cards ("Glide can be…") and cuts. | The owner decision says it must look like the launch video and real Glide must do it. Motion added in the edit would break the "real feature" promise. | For each beat, the take path, Glide commit and `marks.tsv` are recorded in #346. The edit decision list shows only cuts plus title-card clips. | [#346 body](https://github.com/kvnloo/glide/issues/346) (owner decision, acceptance per beat), take notes | P1, P9 |
| F2 | **Cut latency; never time-remap.** Model latency (6–9 s from send to mount, against about 4 s in the reference) is removed by cutting on `marks.tsv` marks, never by speeding up or ramping the clip. Card motion inside a kept span plays at 1×. | Speed ramps would make the 180/480 ms entrances look wrong and would misrepresent the product. Cutting keeps both honest. | The fframestudio project has every clip at speed 1.0, and the cut points line up with the `send`/`mount` marks. | Take notes ("Timing … Cut in the edit"), `glide/docs/studio.md:59-77` | P1 |
| F3 | **One mover at a time.** Background motion (the wallpaper cross-fade at send, the theme change) finishes before a foreground entrance starts. At most one entrance is in flight per frame. | The reference reads because each beat moves one thing. Today the 8-step wallpaper cross-fade and the card entrance can overlap in a take. | Frame-diff the take: the wallpaper region and the card region never change in the same 100 ms window. | Take notes (wallpaper cross-fades through 8 steps at send), `motion.tsx:77-83` | P1, P6 |
| F4 | **Every on-screen loop runs at 60 fps on a 9.6 s cycle.** For takes, frame-driven views (orb at 15 fps, scene, splash, clean focus and council at 30 fps, count-up at 30 ms frames) either render at 60 fps under a studio flag or are framed so the step doesn't show. Cuts land on the cycle (M4). | `studio.sh rec` now records at 60 fps, but the orb steps at 15 fps, so it judders on 60 fps footage. One cycle lets any beat loop or hold seamlessly in the montage. | `ffmpeg -vf mpdecimate` over the orb region of a take reports ≥ 55 unique frames per second while it moves (see D4). | `frontend/src/chrome/orb.ts:156-160`, `frontend/src/splash/launch.tsx:13`, `frontend/src/voice/cleanFocus.tsx:75`, `motion.tsx:6-8`, `glide/docs/studio.md:59-77`, gap audit (60 fps) | P1, P8 |
| F5 | **The gold budget per frame matches the app.** Each beat has one gold subject: the ring, the heatmap, the action button. Everything else is cream on the night plate. Title cards use the gold tail only on "Glide". | Dash gold replaces the reference's purple. If gold is everywhere it stops pointing at the feature. This is M9 applied to the film. | Sample each beat's still: saturated gold covers only the subject's bounding box (the `tern_rubric.py` R13/R14 logic applied to the frame). | [#346 body](https://github.com/kvnloo/glide/issues/346) (`#d7b986`/`#e6cd96`), `docs/DESIGN-LANGUAGE.md:39`, gap audit ("gold tail") | P5, P1 |
| F6 | **Human input cadence.** Typing is per character at 30–70 ms with real pauses, and the cursor appears only if it is the real pointer. Nothing in the UI types faster than a person except agent output. | The beat A/B takes already do this. Writing it down stops future takes being scripted as instant pastes, which read as fake. | `marks.tsv` `type` spans are ≥ 30 ms × the character count. | Take notes ("typed per character … 30–70 ms gaps") | P1, P6 |
| F7 | **The restyle beat (50–56 s) is one live `glide_ui_style` call per look.** Each change is the M6 cross-fade, captured in a single take, with hard cuts between looks. | It proves the theme engine is live. A dissolve made in the editor would hide whether it was real. | The take's `marks.tsv` has one `style` mark per look, and the ink at each mark moves monotonically over 480 ms. | [#346 beat table](https://github.com/kvnloo/glide/issues/346), gap audit (themes row), `glide/ui.py:105-115` | P1, P7 |
| F8 | **Pages in the montage keep app rules.** Night Drive, Piano, Pixels and the character creator use the pane's `--glide-*` tokens and honour reduced motion (M7), so a clip of them shot in reduce mode is still a valid still. | The pages are both film beats and shipped features. One rule set means the film never shows behaviour the product lacks. | The M7(b) page test passes for every page used in the montage. | `glide/pages/README.md:7-14`, `glide/pages/piano.html:469`, `glide/pages/night-drive.html:319` | P7, P3 |

## C. Decisions for Kevin (defaults chosen; easy to undo)

| ID | Question | Default in this list | Why the default |
|---|---|---|---|
| D1 | May gold move to show that something is running? | Yes, but only for the one pane-level live thing (the composer streak or the ring). Card-level running markers move in cream (M9). | Keeps §3's intent ("gold = the one action or focus") and only touches two card loops. |
| D2 | Who may glow? | The focus ring and the glass demo. Rubric #5 is reworded to match (M10). | The owner rule in `cleanFocus.tsx:4` is newer than the rubric line and is already the shipped behaviour (`ui.py:63`). |
| D3 | Does the film add the reference's camera tilt, falling petals and cursor in post? | No camera moves on UI. Petals only if a real wallpaper layer does them. Cursor only if it is the real pointer (F1, F6). | "Real Glide does it" is the film's thesis (#346). The take notes list these under "What still differs". |
| D4 | Should the orb render at 60 fps for film takes (F4)? | Yes, but only under a studio flag. Default runtime stays at 15 fps. | A 60 fps orb in daily use costs memory and frames for no user benefit. The film needs it, and the cycle cache bounds the blobs either way. |

## D. Next PRs (hill-climb order: impact over cost)

1. **Motion tokens and drift (M2, M3, M4).** Add `MOTION` to `tokens.ts`, move the six loops onto the 9.6 s clock and extend `tokenDrift`. Small change; it fixes most of the inconsistency.
2. **Live reduced motion (M7).** Forward the `motion` event to clean focus and the council popup, add a reduced path to `piano.html` and add the page test. Small change; fixes a user-facing accessibility gap.
3. **Rubric text for D1 and D2 (M9, M10).** A two-line `DESIGN-LANGUAGE.md` change, plus cream running markers on cards.
4. **Restyle cross-fade (M6), with F7 shot with it.** Medium change; unblocks the 50–56 s beat.
5. **A studio 60 fps flag for frame-driven views (F4, D4).** Medium change; needed before the 60 fps re-shoots listed in the gap audit.
6. **Compositor-cheap loops (M11).** Rewrite the streak and the work-tree pulse as `transform`/`opacity`. Small change.

## Appendix: motion inventory at 6c1e677

These durations, curves and reduced-motion paths were read with `rg` over `frontend/src` and
`glide/frontend`, excluding tests, vendor and dist.

| Surface | Durations | Curve | Loop period(s) | Reduced path |
|---|---|---|---|---|
| Card motion (`glideui/motion.tsx`) | 180, 480, 600, 30×16 | settle | 2.8, 3.2, 4.2 s | media query |
| Kit motion (`sandboxMotion.mjs`) | kit-defined | `.2,.75,.3,1` / `.2,.85,.35,1.18` | kit | media query, per rule |
| Glass (`glass.ts`) | 80, 150, 180, 200, 250 | `.2,.7,.2,1` | 2.4 s (hover rim) | media query + transparency |
| Intent cards (`intentCards.ts`) | 150, 500, 900, 1000 | keyword ease | 1.2, 1.4 s | media query (hero) |
| Attention cards (`attentionCards.ts`) | 900 | ease-out | 1.6 s | media query (hero) |
| Work tree (`workTreeCard.tsx`) | — | ease-in-out | 1.4 s | media query |
| Agent tree (`treeView.tsx`) | 160, 200 | ease | — | media query |
| Composer streak (`view/styles.ts`) | 150, 120 | ease | 1.8 s alternate | media query |
| Orbit (`orbitTargets.ts`) | 180, 200, 300 | brake curve | turn/jiggle | media query |
| Orb (`chrome/orb.ts`) | 15 fps (30 for scenes) | engine | 9.6 s | caps + live event |
| Splash (`splash/launch.tsx`) | 30 fps, ≤ 15 s | engine | — | caps + live event |
| Clean focus (`voice/cleanFocus.tsx`) | 30 fps | sine | 4.8 / 9.6 s | caps at open only |
| Council (`councilExchange.ts`, `councilPopup.ts`) | 900, 650/clause, 24 ms/char | linear/sine | — | caps at open only |
| Pages (`glide/pages/*.html`) | rAF | page | page | night-drive: media query · piano: none |

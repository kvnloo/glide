# Glide design language

One language for every Glide card, popup, pane, chrome strip and demo inside Tern. The look is Dash's
"Living Night": black canvas, cream ink and one gold. The layout grammar is omp's, because Glide's cards
are guests in omp's transcript. Tokens live in `glide/frontend/tokens.ts`. The drift gate
(`frontend/src/__tests__/helpers/tokenDrift.ts`) fails any radius, font size, letter-spacing or hex
that isn't a token.

## 1. What every surface must do (the rubric)
Score each criterion 0–5 and take the weighted percentage: **≥ 80 ship · 65–79 polish · < 65 redesign**.

| # | Criterion | Weight | Pass bar |
|---|---|---|---|
| 1 | Glanceable answer | 20 | Within 2 s you can tell what it is, its state and the next step. It has one hero, not a pile of chips. |
| 2 | Actionable | 15 | It ends in one recommended action, or links back to the goal or ask. Showing raw data alone fails. |
| 3 | Density and hierarchy | 15 | Dense but readable: rows of about 44–52 px, no oversized cards, the eye lands on the hero first. |
| 4 | Dash fidelity | 15 | `#0c0c0a` canvas, cream ink, gold only for the one action. Fonts are Hanken, Cormorant and Plex Mono. |
| 5 | Glass | 10 | One light source: a neutral top hairline and a neutral shadow. No coloured glow, motes or sparks. The `/glide glass` demo is the only place a glow may appear. |
| 6 | Cohesion | 10 | It uses the same radius scale, type ramp, chip grammar, status hues and head row as its siblings. |
| 7 | Vocabulary | 5 | Use the right nouns (host, harness, bot, lane, session). No raw booleans, internal IDs, paths, `[kind=…]` or developer copy. |
| 8 | Quiet motion | 5 | State shows as thinking-orbs-style motion. Hover and press affordances are implied. `prefers-reduced-motion` gets fixed frames. |
| 9 | Phone parity | 5 | At 412 px nothing truncates, wraps badly or overflows, and tap targets are at least 44 px. |

## 2. Card grammar (measured against omp in Tern, 1060×596 window, font 13)
- **Column:** cards fill the transcript column, which is 880 px at that window size. Never set a fixed
  `max-width` on a card. omp's composer is 736 px and centred. The transcript is wider than the composer
  on purpose.
- **Head row** above the box: 24 px tall, `Glide · <title>` set as 500 13 px name then 400 13 px title.
  The title ellipsizes and never wraps.
- **Box:** 8 px radius (`RADIUS.tile`), a 1 px `--l3` border, `--l1` fill and no shadow. Body inset is 14 px.
- **Inside:** prose is capped at 72ch. Tiles are content-width (`flex: 0 1 152px`), never stretched.
  Buttons are content-width (min 160 px, padding 7×16, 1 px outline). There are **no full-width buttons**.
- **Order:** one state line, one verdict line, one action. Facts follow only if they add something the
  hero doesn't already say.

## 3. Tokens (`glide/frontend/tokens.ts`)
- **Colour:** use `DASH` and `NIGHT` (popups) only. Use the host's `--h-*` variables where the host
  theme applies. Status hues are `--h-success`, `--h-warning` and `--h-danger`, falling back to `STATUS`.
- **Gold means "the one action".** It never marks a key term, a count or "running". Running state is
  carried by motion or a status pill.
- **Type ramp (px):** 10 label · 11 meta · 12 small · 13 body · 15 lead · 17 name · 20 title ·
  28 display · 44 hero · 88 giant. Nothing goes under 10 px.
- **Radius (px):** 4 chip · 8 tile/card box · 12 block · 16 popup/pane · 999 pill · 50% circle.
- **Tracking:** `.08em` caps labels · `.16em` eyebrows · `-.01em` tight · `-.04em` display.
- **Contrast:** every text ink is at least 4.5:1 on what sits under it, including glass over a bright wallpaper.

## 4. Two chips, no more
- **Status pill:** radius 999, 10 px mono caps `.08em`, tinted with a status hue. It says what the thing
  is doing now (`RUNNING`, `HELD`, `DONE`, `FAILED`).
- **Fact chip:** radius 4, 11 px sans, muted ink on `--l2`. It is a noun with an optional value
  (`3 hosts`, `main +2`).
- Never repeat in chips what the hero already says.

## 5. Copy
- Use plain verbs and the right nouns. Write `Downloads: off`, not `Downloads false`. Write `Lane timed
  out. Retry?`, not `dead · provider timed out after 30s`.
- Spell IDs and hashes once, short (7 characters), in mono, and give them a copy affordance.
- Sample/demo data is labelled once, quietly (`SAMPLE` status pill), never with a paragraph.

## 6. Evidence a change needs
- A unit test for the behaviour, plus an opt-in to the drift gate for every file the change styles:
  `expect(tokenDrift(readFileSync(<file>, 'utf8'))).toEqual(NO_DRIFT)`.
- A headless shot script, `glide/tools/<surface>-shots.mts` (copy `lanes-shots.mts`), that renders the
  real component over synthetic data at 1060 px and 412 px in the Dash theme.
- Before/after PNGs in the PR body. Real-Tern stills are taken by the integrator.

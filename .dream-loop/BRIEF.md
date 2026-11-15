# W8 visual brief

Revision: retry-20261114. Owner approval remains pending. Project: Glide.
Target revision: W8-cohesion-dreamloop-BRIEF.md, including its retry note.
Baseline source: 653d6e98c669f9293c4d4d5f625714a398345dbe, verified against upstream main.
Target hashes are frozen in STATE.json. Existing owner captures are references, not newly captured baselines.
Deliverable: production UI, one unmerged PR, native captures, a motion clip, and a published comparison board.
Capture contract: real isolated Tern, logical viewport 1060 x 596, font 13, Dash, synthetic populated session. MBP currently captures at DPR 2. Any normalized presentation must retain its native original and disclose resampling.
ART STYLE: omp layout and rhythm. Flat content-sized boxes, 1 px hairline, 8 px corners, cream ink on Living Night. Hanken and Plex Mono inside cards. No decorative seat hues or wallpaper behind transcript cards.
Final-density contract: inspect the native capture and its layout dump. A resized sheet is presentation evidence only.
AI imagery scope: none. Do not paint over screenshots or replace actual rendered UI.

## Owner preferences, verbatim

> "run the dream loop skill and actually think about cohesive ui? tbh the hermes logo here w the card looks bad, no? and some of the other cards dont look good? idkkkk it doesn't feel as nice as oh my pi, can you look at the oh my pi refs again?"

> Copy the omp GRAMMAR (layout, rhythm, restraint), keep Dash "Living Night" palette (black #0c0c0a, cream ink, ONE gold = the one action). Do not copy omp's light theme.

> No paid tools.

> Do not touch Kevin's own Hermes install/gateways.

> Capture on `mbp` (isolated headless sway/Tern, as your .dream-loop/native-baseline.py already plans) when MemAvailable ≥ 4 GiB; else groot ≥ 4 GiB.

> If memory dips mid-round, wait and retry (poll 60 s, up to 45 min) rather than exiting.

## Reference reading and breadth-first order

| Element | Mode | Verified gap | First hypothesis | Protected deviation |
|---|---|---|---|---|
| Transcript canvas | INTENT | Owner screenshot puts most content over a blurred wallpaper. glass.ts frosts and rims transcript nodes. | Make the transcript canvas opaque and neutral. | Keep Dash, not omp's slate palette. |
| Welcome | INTENT | welcomeNode returns a full card and a 52 px portrait. Owner screenshot shows its large empty black box. | Unboxed compact monochrome lockup, mark at most 32 px, quiet version and tip. | Keep Hermes identity. |
| Council | INTENT | councilPopup.ts uses display serif headings, 16 px container corners, mineral-colored seats and independent tab/button styling. | Apply the shared card grammar and neutral seat states. | Preserve working council controls, transcript receipts and speech. |
| Focus and read-aloud | INTENT | Owner contact sheet shows different stage treatments. | Share one centered orb/caption stage. | Permit glow only on the focus timer ring. |
| Work tree, agents and receipt | INTENT | Owner contact sheet shows independent headings and status dots. | Share head, body and completion rows. | Preserve navigation and live task state. |
| Taste, studio and follow-up | INTENT | Contact sheet includes empty/error content and inconsistent row heights. | Populate synthetic states, use content-sized bodies, keep one recommended action. | Do not invent successful backend data. |
| Auto and gold restyles | INTENT | Owner contact sheet shows brown-tinted card bodies. | Keep neutral layers and restrict gold to the selected action. | Preserve supported theme switching. |
| Sidebar, pickers, composer and other cards | INTENT | Source contains separate widget styles. Native breadth-first scan still required. | Inspect before selecting a change. | Host-owned Tern chrome is not a plugin defect. |

## Authority and gates

- Read source and saved receipts before dispatch. Never substitute an existing screenshot for a new capture.
- Baseline every reachable state before production edits. A shell, startup error, missing gateway, or empty fixture does not count.
- One hypothesis class per round. Retain parent and candidate image hashes, source revision, capture settings, overlays and comparison sheets.
- Two fresh blind A/B reviews with swapped sides. Use only a verified free vision route. Missing verdicts cannot become accepts.
- Technical gate: focused regression tests, typecheck, lint, token drift, full suite through the fleet-runner mirror, native tern_rubric R01-R17.
- Brief gate: every measured surface at least 80, plus a complete contact sheet judged as one product.
- Owner gate: Kevin approves the look. Do not merge or call a critic preference owner approval.
- Stop after two unsuccessful trials on one defect family. Preserve both trials and explain the unresolved gap.
- Current status: blocked before a qualified Dash baseline and free vision judging. Seven offline readiness and isolation regressions pass. The published comparison is diagnostic only. No production visual round or acceptance yet.

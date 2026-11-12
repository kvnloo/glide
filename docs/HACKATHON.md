# Glide — Hackathon submission

**Tagline:** A glass terminal for Hermes Agent where intent, approvals, and workspace state become visible cards.

## Summary (120 words)

Glide is a Hermes Agent plugin that puts a card-based workspace in Tern. It pairs chat with inspectable UI for a proposed task, a council review, and the state of agents, hosts, and a factory graph. \`/glide intent ...\` turns an ask into declaration and approval cards; \`/glide intent proof\` shows sample receipt, not evidence that work ran. \`/council\` plays a synthetic review unless a council endpoint is configured. Fleet views request validated snapshots from the attached Hermes session and depend on an available data provider. Wallpaper-aware themes and a glass demonstration sit alongside optional local corrections memory and attention-guard cards. The goal is to make state and consent visible without claiming automatic orchestration or results that do not exist.

## What it does

- **Declare an intent and inspect its proof:** \`/glide intent <ask>\` displays declaration, contract, approval, and sample work cards. \`/glide intent proof\` shows a **sample** fingerprint receipt for the last ask; neither command executes the plan. Implemented in [\`frontend/src/commands/glide.ts\`](../frontend/src/commands/glide.ts).
- **Convene a council:** \`/council\` opens a Socratic review popup. Without a configured \`GLIDE_COUNCIL_URL\`, or if that source fails, it explicitly labels the synthetic run **DEMO** rather than inventing live votes. Implemented in [\`glide/frontend/councilPopup.ts\`](../glide/frontend/councilPopup.ts).
- **Inspect a fleet:** \`/hosts\` and \`/portfolio\` request validated cards for available hosts, agents, pods, and product tasks. They rely on local sources; missing sources do not become fictional live hosts. Implemented in [\`frontend/src/commands/fleet.ts\`](../frontend/src/commands/fleet.ts), [\`frontend/src/wire/fleet.ts\`](../frontend/src/wire/fleet.ts), and [\`glide/fleet.py\`](../glide/fleet.py).
- **Explore the factory graph:** \`/factory graph\` requests a read-only graph-node card. Node actions open an existing link or prepare a follow-up draft, not an automatic fix. Implemented in [\`frontend/src/commands/fleet.ts\`](../frontend/src/commands/fleet.ts) and [\`glide/fleet.py\`](../glide/fleet.py). Separately, \`/factory\` toggles a factory aside or dispatches to an installed factory plugin through [\`frontend/src/commands/factory.ts\`](../frontend/src/commands/factory.ts).
- **Wear the wallpaper:** \`/glide theme auto|default|export\` switches or exports a pywal-derived palette; \`/glide glass demo\` cycles glass effects when wallpaper theming is available. Implemented in [\`frontend/src/commands/glide.ts\`](../frontend/src/commands/glide.ts) and [\`glide/frontend/wal.ts\`](../glide/frontend/wal.ts).
- **Opt in to useful local state:** \`/glide\` uses approval cards to build and enable corrections recall; \`/glide focus\` offers a deep-work block and held-ask digest. Implemented in [\`frontend/src/commands/glide.ts\`](../frontend/src/commands/glide.ts) and [\`glide/core.py\`](../glide/core.py); see the [attention contract](../glide/docs/attention.md).

## How to try it

Use Hermes Agent **0.23.0 or later**, Tern, and Node.js. Install the standalone plugin and accept its enable prompt. Hermes may flag a **CAUTION** scanner verdict: inspect the findings before approving. Launch inside a Tern pane, not an ordinary terminal or terminal multiplexer.

\`\`\`sh
hermes plugins install kvnloo/glide
hermes tern
\`\`\`

In the attached Tern chat, try these **five commands**:

\`\`\`text
/glide intent Draft a release checklist
/council
/hosts
/factory graph
/glide theme auto
\`\`\`

The intent and unconfigured council are demos, not finished work. Fleet cards depend on available local source data; the theme needs pywal colors (or \`GLIDE_WAL_COLORS\`). For the sample intent receipt, \`/glide intent proof\` is also implemented.

## How it was built

Glide packages a Python Hermes standalone plugin ([\`plugin.yaml\`](../plugin.yaml), [\`glide/core.py\`](../glide/core.py)) with a TypeScript frontend drawn through Tern's native Surface Protocol. Host-owned approval cards keep user actions explicit. The fleet adapter validates source documents and action targets before rendering or opening them. The client can fall back to Hermes \`command.dispatch\` when optional plugin gateway methods are unavailable. Optional corrections memory is local and opt-in; quoting it into a turn can send that excerpt to the user's configured model provider.

The Tern frontend is derived from [alt-glitch/hermes-tern](https://github.com/alt-glitch/hermes-tern) (MIT); Glide's added cards, adapters, memory, and attention code live alongside it.

## What's next

Replace sample intent plans and fingerprint receipts with real execution and verifiable turn receipts; capture a configured live council run and reproducible fleet/factory pane evidence; keep clearly distinguishing demos, unavailable integrations, and measured behavior. No performance or cost-saving claim is made for this submission.

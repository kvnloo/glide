# Glide

An agent workspace that guards two scarce resources: your attention and the agent's context window. Glide is a [Hermes Agent](https://github.com/NousResearch/hermes-agent) plugin with a native [Tern](https://stencil.so/tern) chat frontend.

- **Your attention.** `/glide focus` shows the phase, next work window, and bedtime when its inputs are available. A deep-work block holds non-critical notices explicitly routed through Glide and returns them as one digest. On request, wind-down saves a resume note, which the next day's first hook invocation consumes once. It estimates active hours from local session timestamps, not measured productivity. Optional z0intelligence and Flowkit inputs supply circadian posture and flow likelihood. [Attention](glide/docs/attention.md)
- **The agent's context.** Opt-in corrections memory quotes up to three matching past corrections into a turn. This gives the model relevant history, not a guarantee it will obey. Offload sends small tasks to an existing local model. [Memory implementation](glide/docs/memory.md)

Derived from alt-glitch/hermes-tern (MIT). This fork adds the Glide memory backend, attention guard, onboarding cards, a skill-ranking catalog, a benchmark referee, local-model offload, local fleet and intelligence cards, and the Dash-derived design language. [Submission](docs/SUBMISSION.md) · [Fork details](FORK.md) · [License](LICENSE)

## Install

The fresh-install check is currently blocked by a DANGEROUS community-plugin scan. It flags a destructive cleanup command in [developer test tooling](frontend/e2e/army/boat/sweeps_up.py). `--force` does not override that verdict. Do not disable the scanner to follow this guide. The commands and card flow below describe the implementation, not a passing fresh-install result.

Use a current Hermes Agent with standalone-plugin and gateway support, Tern, and Node.js. The plugin manifest requires Hermes ≥0.23.0. [Manifest](plugin.yaml) · [Launcher](launcher.py)

Hermes scans community plugins before installing them. Review the findings before using this non-interactive command: `--force` accepts a CAUTION verdict, `--enable` enables the plugin, and `--yes-deps` consents to dependency installation. The scanner still blocks DANGEROUS findings. For an interactive review, omit these flags. [Isolated installer check](glide/docs/fresh-install.md)

```sh
hermes plugins install kvnloo/glide --force --enable --yes-deps
```

After a successful install, the plugin is enabled. One install includes the Tern frontend and Glide. The installed plugin is named `glide` (earlier releases used `hermes-tern`; its data folders move to the new name on first load, and settings under `plugins.entries.hermes-tern` must be set again under `plugins.entries.glide`). Do not also install the standalone `glide/` subdirectory into the same profile. [Registration](https://github.com/kvnloo/glide/pull/223)

In a Tern pane, outside tmux, screen, or zellij:

```sh
hermes tern
```

The frontend needs Tern's Surface Protocol. An ordinary terminal cannot render it. [Launcher contract](launcher.py)

## Guard your attention

In the attached Tern chat:

```text
/glide focus
```

1. **Focus card.** Phase, flow likelihood (only with a live Flowkit estimate; an estimate, not a diagnosis), next deep-work window, bedtime, and how many asks are held.
2. **Start block.** Approve a 50-minute block. The hook asks Hermes to keep replies short and defer non-critical questions. Glide queues notices explicitly routed to it; `critical` still passes. It does not block unrelated desktop notifications.
3. **End block.** One digest card lists everything held.
4. **Wind-down.** `/glide focus wind-down` saves the previous eligible session's title and last three user asks, excluding the current session. The next day's first hook invocation consumes the note once and asks the model to offer to resume it. A retried or cancelled turn need not display that offer.
5. **Your hours.** `/glide focus hours` shows the two-hour windows with the most qualifying session activity over the last 30 days.

Without the optional integrations, phase and work-window estimates come from local session timestamps. Bedtime and flow likelihood can remain unknown. [How it decides](glide/docs/attention.md)

## Guard the context window

In the attached Tern chat, enter:

```text
/glide
```

The [card flow](frontend/src/commands/glide.ts) presents these steps. Each write or benchmark waits for its approval button.

1. **Detect.** Inspect CPU, RAM, GPU, local runtimes, and optional z0intelligence health. Detection installs nothing.
2. **Build memory.** Approve a read of up to 100 recent eligible local sessions, excluding the current session. Glide keeps user messages that begin with `Correction:`, `Actually,`, or `No,`. Review the counts on the proof card. A new profile needs prior corrections before recall can return a match.
3. **Turn on.** Approve the recall hook. Current instructions take precedence over quoted history.
4. **Skill router.** Approve **Install** to save the built-in category-to-skills catalog. This installs ranking metadata, not the referenced skills or an automatic per-turn skill loader.
5. **Hill climb.** Approve **Run one round** to repeat the same CPU benchmark command for baseline and candidate samples to demonstrate noise handling. The referee can report KEEP, REVERT, or INCONCLUSIVE. This demo does not edit code or train a model.
6. **Offload.** With Ollama and an existing local model available, approve **Offload it** to send one sample summary task to that model. The savings card reports estimated tokens and cost, not a measured billing reduction. No model is downloaded for you.

For a correction about release tests, inspect the matching history:

```text
/glide recall release tests
```

Disable automatic correction quoting:

```text
/glide off
```

Memory extraction and BM25 ranking make no model calls. If an existing z0intelligence corrections reader returns matches, recall prefers those and otherwise falls back to Glide's store. [Recall selection](glide/core.py) Glide opens the source database read-only and writes derived memory under the active profile's `glide/` directory. Once you enable recall, excerpts enter Hermes' model context and can reach your configured remote provider. Do not enable it for history you do not want that provider to receive. [Storage and privacy contract](glide/docs/memory.md)

## More in the chat

These commands show local state as native cards in the chat.

| Command | What it shows |
|---|---|
| `/theme` | Pick the colours: Tern, Nous, the Hermes skin, the wallpaper (pywal, live) or Dash's black and gold. `/glide theme auto\|dash` sets the same. |
| `/glide glass` | A liquid-glass demo card. It is the only surface allowed to glow. |
| `/glide taste` | The newest Taste Atlas board beside the chat. [Requirements](glide/docs/taste.md) |
| `/glide studio [project-id]` | Opens fframestudio and previews the selected project's scene layers. [Requirements](glide/docs/studio.md) |
| `/glide lanes` | Live-voice helper lanes, their model and billing. |
| `/intel` | Local intelligence: hill climbs, skills, memory, failures, traces. |
| `/hosts` | Fleet hosts, agents, gauges and k3s pods. |
| `/portfolio` | Work portfolios, products and tasks. |
| `/factory` | The content factory graph, runs and renders. [Factory](glide/docs/factory.md) |
| `/council` | A Socratic council popup with one verdict per seat. |

The shared design language uses omp's card grammar and Dash's palette. Its rules specify text at 11 px or larger and reserve glow for the glass demo. Token tests check the governed card modules; they do not prove that every rendered surface follows these rules. [Design language](docs/DESIGN-LANGUAGE.md)

## Real Tern screenshots

These existing captures document earlier synthetic demonstrations, not installation on current main. The detect, memory, and recall images come from the fresh-profile demo using [demo/seed.py](glide/demo/seed.py). The router, benchmark, and offload images are separate captures. Current-main native approval-flow proof is pending.

![Detect: hardware, local runtimes, and the memory-build approval](glide/docs/media/glide-fresh-1-detect.png)
![Memory built from five synthetic sessions, with the turn-on approval](glide/docs/media/glide-fresh-2-memory-built.png)
![/glide recall returns the matching correction](glide/docs/media/glide-fresh-7-recall-hit.png)
![Skill router approval](glide/docs/media/glide-s4-ask.png)
![Skill router receipt and benchmark approval](glide/docs/media/glide-s4-router.png)
![Benchmark verdict and offload approval](glide/docs/media/glide-s5-hillclimb.png)
![Local offload estimate](glide/docs/media/glide-s6-savings.png)

The inherited base chat is shown below, not a Glide onboarding capture.

![Native Tern chat and pull request view](docs/images/hero-dark.png)

## Check a fresh install yourself

`bash scripts/e2e-fresh-install.sh` attempts installation from public main into a throwaway `HERMES_HOME`. If installation succeeds, it validates the plugin and exercises memory and attention commands against synthetic sessions through Hermes' real plugin loader. It never touches your real profile or opens Tern. It stops at the first failure. [Details](glide/docs/fresh-install.md) · [Driver](glide/tools/fresh_install.py)

## What runs beyond a prompt

- [Python memory backend](glide/memory.py), [source reader](glide/source.py), and [atomic storage](glide/storage.py) resolve eligible message generations and build a bounded local BM25 index.
- The [registered hook and command](glide/core.py) add matching corrections before model calls. [Session-bound gateway methods](glide/gateway.py) are inactive on released Hermes, which lacks `ctx.register_gateway_method`. The cards use `/glide` command dispatch instead; hosts that provide the API can register the input-validated methods.
- The [TypeScript flow](frontend/src/commands/glide.ts) renders native cards and handles approval actions. [Router](glide/skill_router.py), [benchmark](glide/hill_climb.py), and [Ollama offload](glide/offload.py) modules persist their own results.
- Opt-in live voice shows helper lanes beside the thinking orb. They read real state from a local loopback lane broker and stay off without an explicitly configured token file. Live voice needs a Hermes gateway with the `voice.live` methods; the pinned Hermes may lack them, which shows a visible activation failure. [Voice and lanes](frontend/docs/voice.md)

Optional z0intelligence health detection does not install or configure z0intelligence. The optional Taste pane needs a separately running Taste Atlas app and is not part of the basic memory flow. [Core](glide/core.py) · [Taste requirements](glide/docs/taste.md)

See [the upstream project](https://github.com/alt-glitch/hermes-tern) for the base frontend and [frontend development](frontend/README.md) for build instructions.

## Credits and license

Derived from alt-glitch/hermes-tern (MIT), by [alt-glitch](https://github.com/alt-glitch/hermes-tern). Glide additions are by Kevin Rajan. The frontend began as [can1357's ui-tsp](https://github.com/can1357/hermes-agent/tree/tern-frontend), and some UI patterns come from [T3 Code](https://github.com/pingdotgg/t3code).

MIT. See [LICENSE](LICENSE) and the [Glide license](glide/LICENSE).

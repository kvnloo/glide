# Glide

An agent workspace that guards two scarce resources: your attention and the agent's context window. Glide is a [Hermes Agent](https://github.com/NousResearch/hermes-agent) plugin with a native [Tern](https://stencil.so/tern) chat frontend.

- **Your attention.** `/glide focus` shows your phase, next deep-work window, and bedtime. A deep-work block holds notices explicitly routed through Glide and hands them back as one digest. On request, wind-down saves where you left off for the next morning's first turn. It estimates your most-active hours from local session timestamps and uses z0intelligence's circadian schedule and a Flowkit flow likelihood when they are installed. [Attention](glide/docs/attention.md)
- **The agent's context.** Opt-in corrections memory quotes up to three matching past corrections into a turn, so you stop repeating yourself; offload sends small tasks to a local model. [Memory implementation](glide/docs/memory.md)

Derived from alt-glitch/hermes-tern (MIT). This fork adds the Glide memory backend, onboarding cards, a skill-ranking catalog, a benchmark referee, and local-model offload code. [Submission](docs/SUBMISSION.md) · [Fork details](FORK.md) · [License](LICENSE)

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
4. **Wind-down.** `/glide focus wind-down` saves your last session's open asks; tomorrow's first turn quotes them once.
5. **Your hours.** `/glide focus hours` shows the two-hour windows you worked in most over the last 30 days.

With no wearable and no z0intelligence, everything comes from your local session timestamps. [How it decides](glide/docs/attention.md)

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

## Real Tern screenshots

Existing captures use a fresh `HERMES_HOME` and six synthetic sessions seeded by [demo/seed.py](glide/demo/seed.py). They are not proof that installation passes on current main. No personal history appears.

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

Optional z0intelligence health detection does not install or configure z0intelligence. The optional Taste pane needs a separately running Taste Atlas app and is not part of the basic memory flow. Fresh native-pane proof is pending for this documentation change. [Core](glide/core.py) · [Taste requirements](glide/docs/taste.md)

See [the upstream project](https://github.com/alt-glitch/hermes-tern) for the base frontend and [frontend development](frontend/README.md) for build instructions.

## Credits and license

Derived from alt-glitch/hermes-tern (MIT), by [alt-glitch](https://github.com/alt-glitch/hermes-tern). Glide additions are by Kevin Rajan. The frontend began as [can1357's ui-tsp](https://github.com/can1357/hermes-agent/tree/tern-frontend), and some UI patterns come from [T3 Code](https://github.com/pingdotgg/t3code).

MIT. See [LICENSE](LICENSE) and the [Glide license](glide/LICENSE).

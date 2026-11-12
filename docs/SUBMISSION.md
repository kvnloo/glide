# Glide submission

## Title

Glide: an agent workspace that guards your attention and your agent's context window.

## One-paragraph pitch

Glide guards two scarce resources in a Hermes Agent workspace. **Your attention:** `/glide focus` shows your phase, next deep-work window and bedtime; a deep-work block holds non-critical agent asks and returns them as one digest; at wind-down it saves where you left off so the next morning's first turn starts there; and it learns your best deep-work hours from your own local sessions, using z0intelligence's circadian schedule and a Flowkit flow likelihood when installed. **The agent's context window:** opt-in memory for explicit user corrections, inside a native Tern chat frontend. A guided card flow detects the machine, builds memory from eligible local sessions, and asks before it enables recall. Later turns can receive up to three matching corrections as quoted history, with current instructions taking precedence. Optional follow-on cards save a skill-ranking catalog, run one CPU benchmark comparison, and send a sample task to an existing Ollama model. The practical goal is more uninterrupted deep work and fewer repeated corrections, with inspectable local state and separate approvals for each action. [Attention](../glide/attention.py) · [Memory and hook](../glide/core.py) · [Card flow](../frontend/src/commands/glide.ts)

## What is novel vs a prompt/skill

Derived from alt-glitch/hermes-tern (MIT). The native Tern chat comes from that project. Glide adds executable backend and frontend code, not a claim to have invented the base UI. [Base plugin](https://github.com/alt-glitch/hermes-tern) · [Merged single-install integration](https://github.com/kvnloo/glide/pull/223)

- **An attention guard with real inputs.** Deterministic code learns deep-work windows and a usual stop time from local session timestamps. When installed, it reads phase and bedtime from z0intelligence's `circadian show --json` and a live flow likelihood from Flowkit's loopback API, showing no raw heart data. A block changes what the per-turn hook tells the model and holds `glide.route` notices except `critical`. The wind-down note links attention to context: tomorrow's first turn quotes it once. Tests use recorded circadian postures and synthetic sessions. [Attention](../glide/attention.py) · [Contract](../glide/docs/attention.md) · [Tests](../glide/tests/test_attention.py)
- **Memory that survives a session.** A read-only SQLite source reader resolves edits, rewinds, and compression copies before it extracts explicit corrections. Atomic checkpoints, a backup, and validation protect derived state. The built-in BM25 store returns at most three positive matches without embeddings or model calls. Recall prefers nonempty results from an existing z0intelligence corrections reader, with Glide's store as fallback. [Source](../glide/source.py) · [Storage](../glide/storage.py) · [Retrieval](../glide/memory.py) · [Extraction contract and limits](../glide/docs/memory.md)
- **A registered per-turn hook.** Python code adds matching corrections to Hermes' context only after opt-in. Recall failures do not fail the model turn. Enabling recall can send those excerpts to the configured remote model provider. Local storage is not a guarantee of local-only inference. [Hook](../glide/core.py)
- **Native approval cards.** TypeScript renders detection, approval, and proof cards through `/glide` command dispatch. The session-bound gateway methods (Python input validation tied to the caller's attached session) need `ctx.register_gateway_method`, which released Hermes lacks, so they are inactive for now. [Frontend](../frontend/src/commands/glide.ts) · [Gateway](../glide/gateway.py)
- **Concrete optional tools.** The router saves a deterministic category-to-skills catalog, not skill packages or a per-turn skill loader. The hill-climb module scaffolds a CPU benchmark and records KEEP, REVERT, or INCONCLUSIVE after paired samples. Its demo repeats the same command for both arms, without editing code. Offload calls Ollama and records estimated token and cost savings. These are not automatic model training or proven billing savings. [Router](../glide/skill_router.py) · [Referee](../glide/hill_climb.py) · [Offload](../glide/offload.py) · [Merged card integration](https://github.com/kvnloo/glide/pull/222)
- **Opt-in live voice with honest helper lanes.** `/live` asks before it opens the gateway mic. During a call, lanes beside the thinking orb show each helper's role, model and real state from a loopback lane broker; a dead lane renders as dead, and with no broker token nothing is polled. Live voice needs a Hermes gateway with `voice.live` methods. [Voice and lanes](../frontend/docs/voice.md) · [Lanes](../frontend/src/voice/lanes.tsx)

The [existing synthetic tests](../glide/tests/) cover memory, onboarding, routing, the referee, and offload. Hardware detection can call optional local diagnostic tools. z0intelligence is optional, and Glide does not download models or set up training infrastructure. [Detection](../glide/core.py)

## How to try it

Use a current Hermes Agent, Tern, and Node.js. The root manifest requires Hermes 0.23.0 or later. [Manifest](../plugin.yaml) · [Launcher](../launcher.py)

Hermes scans community plugins and rates this one CAUTION, the same verdict as upstream alt-glitch/hermes-tern: text matches in the Tern frontend's sudo-password prompt and Markdown parser. Review the findings and answer `y` (or pass `--force` non-interactively); this guide does not override the scan. [Hermes installer](https://github.com/NousResearch/hermes-agent/blob/b3746e35ddd32079697728e2df57a9d78f1e9e32/hermes_cli/plugins_cmd_install.py)

```sh
hermes plugins install kvnloo/glide
```

After a successful install, accept Hermes' plugin-enable prompt. This installs both the Tern frontend and Glide as the `glide` plugin. Do not install the standalone subdirectory as well. [Merged registration](https://github.com/kvnloo/glide/pull/223)

In a Tern pane, outside terminal multiplexers:

```sh
hermes tern
```

In the attached chat, for the attention half:

```text
/glide focus
```

Approve **Start block** for a 50-minute deep-work block, then **End block** for the digest of held asks. `/glide focus wind-down` saves where you left off; `/glide focus hours` shows your learned deep-work hours. [Attention contract](../glide/docs/attention.md)

For the context half:

```text
/glide
```

1. Inspect the hardware and optional z0intelligence health cards.
2. Approve **Build memory**. It reads up to 100 recent eligible local sessions, excluding the current session. Prior user messages must start with `Correction:`, `Actually,`, or `No,` to contribute corrections.
3. Inspect the proof counts, then approve **Turn on** if you want matching corrections in model context.
4. Optionally approve the router catalog, one benchmark round, and the sample Ollama task. A local model must already be installed for offload. These steps are separate approvals, not prerequisites for memory.

To inspect matching corrections about frontend work:

```text
/glide recall frontend
```

To stop automatic quoting:

```text
/glide off
```

These instructions follow the [merged card flow](../frontend/src/commands/glide.ts). On an empty profile, build has no history to extract and recall has no matches. Glide's derived memory stays under the active profile's `glide/` directory. [Memory behavior](../glide/core.py) · [Data handling](../glide/docs/memory.md)

## Links

- [Public repository and installation guide](https://github.com/kvnloo/glide)
- [Base project and MIT attribution](https://github.com/alt-glitch/hermes-tern)
- [Root MIT license](../LICENSE) and [Glide MIT license](../glide/LICENSE)
- [Fork feature guide](../FORK.md)
- [Attention guard: sources and rules](../glide/docs/attention.md)
- [Memory design and limitations](../glide/docs/memory.md)
- [Real Tern screenshots](../README.md#real-tern-screenshots) from a fresh `HERMES_HOME` install with synthetic sessions.
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) and [Tern](https://stencil.so/tern)

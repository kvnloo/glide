# Glide submission

## Title

Glide: stop repeating your corrections to Hermes.

## One-paragraph pitch

Glide gives Hermes Agent a native Tern chat frontend and opt-in memory for explicit user corrections. A guided card flow detects the machine, builds memory from eligible local sessions, and asks before it enables recall. Later turns can receive up to three matching corrections as quoted history, with current instructions taking precedence. Optional follow-on cards save a skill-ranking catalog, run one CPU benchmark comparison, and send a sample task to an existing Ollama model. The practical goal is fewer repeated corrections, with inspectable local state and separate approvals for each action. [Memory and hook](../glide/core.py) · [Card flow](../frontend/src/commands/glide.ts)

## What is novel vs a prompt/skill

Derived from alt-glitch/hermes-tern (MIT). The native Tern chat comes from that project. Glide adds executable backend and frontend code, not a claim to have invented the base UI. [Base plugin](https://github.com/alt-glitch/hermes-tern) · [Merged single-install integration](https://github.com/kvnloo/glide/pull/223)

- **Memory that survives a session.** A read-only SQLite source reader resolves edits, rewinds, and compression copies before it extracts explicit corrections. Atomic checkpoints, a backup, and validation protect derived state. The built-in BM25 store returns at most three positive matches without embeddings or model calls. Recall prefers nonempty results from an existing z0intelligence corrections reader, with Glide's store as fallback. [Source](../glide/source.py) · [Storage](../glide/storage.py) · [Retrieval](../glide/memory.py) · [Extraction contract and limits](../glide/docs/memory.md)
- **A registered per-turn hook.** Python code adds matching corrections to Hermes' context only after opt-in. Recall failures do not fail the model turn. Enabling recall can send those excerpts to the configured remote model provider. Local storage is not a guarantee of local-only inference. [Hook](../glide/core.py#L219-L234)
- **Native approval cards backed by session-bound methods.** TypeScript renders detection, approval, and proof cards. Python validates method inputs and requires the caller's attached session. A command-dispatch fallback supports cores without plugin gateway methods. [Frontend](../frontend/src/commands/glide.ts) · [Gateway](../glide/gateway.py)
- **Concrete optional tools.** The router saves a deterministic category-to-skills catalog, not skill packages or a per-turn skill loader. The hill-climb module scaffolds a CPU benchmark and records KEEP, REVERT, or INCONCLUSIVE after paired samples. Its demo repeats the same command for both arms, without editing code. Offload calls Ollama and records estimated token and cost savings. These are not automatic model training or proven billing savings. [Router](../glide/skill_router.py) · [Referee](../glide/hill_climb.py) · [Offload](../glide/offload.py) · [Merged card integration](https://github.com/kvnloo/glide/pull/222)

The [existing synthetic tests](../glide/tests/) cover memory, onboarding, routing, the referee, and offload. Hardware detection can call optional local diagnostic tools. z0intelligence is optional, and Glide does not download models or set up training infrastructure. [Detection](../glide/core.py)

## How to try it

Use a current Hermes Agent, Tern, and Node.js. The root manifest requires Hermes 0.23.0 or later. [Manifest](../plugin.yaml) · [Launcher](../launcher.py)

Hermes scans community plugins and rates this one CAUTION, the same verdict as upstream alt-glitch/hermes-tern: text matches in the Tern frontend's sudo-password prompt and Markdown parser. Review the findings and answer `y` (or pass `--force` non-interactively); this guide does not override the scan. [Hermes installer](https://github.com/NousResearch/hermes-agent/blob/b3746e35ddd32079697728e2df57a9d78f1e9e32/hermes_cli/plugins_cmd_install.py)

```sh
hermes plugins install kvnloo/glide
```

After a successful install, accept Hermes' plugin-enable prompt. This installs both the Tern frontend and Glide as the `hermes-tern` plugin. Do not install the standalone subdirectory as well. [Merged registration](https://github.com/kvnloo/glide/pull/223)

In a Tern pane, outside terminal multiplexers:

```sh
hermes tern
```

In the attached chat:

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
- [Memory design and limitations](../glide/docs/memory.md)
- [Real Tern screenshots](../README.md#real-tern-screenshots) from a fresh `HERMES_HOME` install with synthetic sessions.
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) and [Tern](https://stencil.so/tern)

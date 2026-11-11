# Glide

Stop repeating yourself to Hermes. Glide reads your past local sessions, keeps the corrections you
gave ("no, …", "actually, …", "correction: …"), and quotes the ones that match into each new turn.

With Hermes Agent ≥0.23.0 and Tern, one install gives you the native UI and this plugin:

```sh
hermes plugins install kvnloo/glide
```

For memory without Tern, install `kvnloo/glide#glide` instead. Do not install both variants.
The [main README](../README.md#walk-through-glide) covers the guided cards, skill router,
hill climb, local offload, and optional Taste pane.

`hermes glide` or `hermes --tui glide` opens Tern when `hermes-tern` is enabled in the same profile.
It selects the `glide` frontend channel when registered, otherwise the default Tern frontend.
Without `hermes-tern`, Glide opens the regular TUI. `hermes glide onboard` still runs memory onboarding.

If your Tern channel registry has `"alias": "glide"`, remove that alias from `channels.json`.
Keep the channel itself. Glide now owns the CLI command, so the alias would collide with it.
Glide never edits the registry.

Then, in any Hermes chat (CLI, TUI, desktop or a messaging gateway):

| Command | What it does |
|---|---|
| `/glide` | Shows this machine (CPU, RAM, GPU, local runtimes) and your memory |
| `/glide build` | Reads your last 100 local sessions and keeps the corrections you gave |
| `/glide on` | Before each turn, quotes up to three matching corrections. Current instructions still win |
| `/glide off` | Stops quoting |
| `/glide recall <words>` | Shows what would be quoted for those words |
| `/glide taste` | Opens the optional local Taste Atlas brainstorm board beside chat in Tern; text frontends show its URL |

Nothing happens until you run `/glide build` and `/glide on`.

## How it works

- **Source:** your profile's `state.db`, opened read-only. Only local sessions count (cli, tui,
  desktop, gui, acp, local); cron, delegated and hidden sessions are skipped. Rewound and compressed
  messages are resolved to their newest copy, and a correction you later withdrew is dropped.
- **Memory:** `<profile>/glide/memory.json` (plus a backup and a lock file), written atomically and
  resumable.
- **Recall:** if z0intelligence is installed, its unified corrections store answers first (see
  below). Otherwise, or when z0int fails or finds nothing, deterministic BM25 over the kept
  corrections, top three, content words only. No embeddings, no model calls either way.
- **Per turn:** a `pre_llm_call` hook adds the matches as quoted history. If anything fails, the
  turn goes on without it.

Details and the extraction contract: [docs/memory.md](docs/memory.md).

## Frontends that draw cards

Glide registers session-bound gateway methods: `glide.detect`, `glide.sync`, `glide.enable`,
`glide.recall`, and `glide.taste`. The same methods are available through `/glide json <verb> {params}`
when the core has no plugin gateway methods. A frontend such as
[Tern](https://github.com/alt-glitch/hermes-tern), or this repo's own Tern frontend
(`hermes plugins install kvnloo/glide`), can call them to show `/glide` as cards with
approve buttons. On a Hermes core without plugin gateway methods they are skipped, and `/glide`
works as text.

## Optional Taste pane

Taste stays closed until you run `/glide taste`. It does not enable corrections memory or start a server.
Use the existing Taste Atlas webapp with its private data configured, then run its server:

```sh
node scripts/board.mjs serve
```

Glide reads `http://127.0.0.1:8789/api/boards` and opens the newest brainstorm board in a native Tern
browser pane. With no boards, it opens the Boards view. Close that pane with Tern's normal controls.
Set `GLIDE_TASTE_URL=http://127.0.0.1:<port>` in the Hermes environment for another local server.
Only HTTP loopback origins are accepted, without credentials, query strings, or redirects.
The server owns the private data and live updates. Glide does not copy or publish them.
The webapp can load the external reference images already saved on a board.

## Security and privacy

- **Network:** no telemetry or uploads. Only `/glide taste` reads the existing loopback Taste Atlas server.
- **Reads outside its data:** Hermes' session database, read-only.
- **Commands:** `/glide` (the overview only) runs `nvidia-smi` and, if installed, `z0int doctor --json`,
  each with a 20 s timeout, to describe the machine. Recall (and each turn, once on) runs
  z0int's `orientation.py --corrections --raw` reader with a 5 s timeout when z0int is installed.
  Nothing is installed.
- **Writes:** only under `<profile>/glide/`.
- **Background processes:** none.

## Optional: z0intelligence

If [z0intelligence](https://github.com/kvnloo/z0intelligence) is installed, `/glide` reports its
health, and recall uses z0int's unified owner corrections: the same reader its Claude Code, Hermes and
omp hooks run (`z0int.orientation --corrections`, store `~/.local/state/z0int/CORRECTIONS.jsonl` or
`$Z0INT_CORRECTIONS`). Those come from every harness z0int reads, not only this profile, so `/glide on`
works without `/glide build`. `/glide recall` labels them `(z0int)`. Glide finds z0int's reader where z0int
puts it: `$Z0INT_ORIENTATION`, the deployed reader its hooks run
(`~/.local/lib/z0-state-packet/current/src/z0int/orientation.py`, stdlib only), an importable
`z0int.orientation`, or the Python named by a `z0int` script on `PATH`.

Glide works without it: the local store above is the fallback, and also answers when z0int errors,
times out or matches nothing.

## Development

For the isolated install, validation and non-interactive `/glide` flow, run
`bash scripts/e2e-fresh-install.sh` from the repository root.
See [the fresh-install check](docs/fresh-install.md) for requirements, boundary stubs and safety limits.

From `glide/`, with a Hermes checkout on `PYTHONPATH`:

```sh
python -m pytest -q tests
```

From the repository root, check CLI registration, channel routing without an alias, and onboarding:

```sh
python glide/tools/verify_launch.py
python glide/tools/check_layout.py --upstream upstream/main
```

The launch check uses a temporary profile and synthetic history. It intercepts the final chat launch
so it cannot open a desktop window. For the isolated native Taste check, see [Taste](docs/taste.md).

MIT licensed.

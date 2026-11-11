# Isolated fresh-install check

From a fresh clone, run:

```sh
nice -n 10 bash scripts/e2e-fresh-install.sh
```

Requirements: Bash, Git, uv, Python 3.14, and public GitHub/package-registry access.
The runner creates its own `HERMES_HOME` with `mktemp -d`, even if the caller
already set one. It ignores inherited `TMPDIR`, replaces `HOME`, and clears environment variables,
including provider credentials. It never uses a real Hermes profile.

The runner fetches the exact Hermes revision in `frontend/hermes-src.lock` and
installs its frozen dependencies. It then runs the real commands:

```sh
hermes plugins install kvnloo/glide --force --enable --yes-deps
hermes plugins validate "$HERMES_HOME/plugins/hermes-tern"
```

This tests public main, not an unpublished plugin patch. Both installed SHAs
appear in the log. `--force` is explicit consent to the scanner's CAUTION
verdict for this custom source. The scan still runs, and DANGEROUS still blocks
installation. Do not treat this test's consent as advice to trust other plugins.
`--yes-deps` supplies dependency consent for non-interactive installation.

The driver discovers the enabled plugin with Hermes' real loader and checks the
handler's source path. It runs `/glide`, the empty-home `/glide on` refusal,
`build`, `on`, matching/nonmatching `recall`, `off`, `json recall`, `setup`, and
`taste`. It also checks hook injection before/after opt-in, cron/current-session
exclusion, persisted memory, and final opt-out. Each step prints its result and
fails on an unexpected response.

Only synthetic sessions enter the real SessionDB. Optional hardware/z0int probes
are stubbed at the plugin boundary. Taste uses a disposable loopback HTTP fixture,
not private boards. Process creation and external socket connections are blocked
during the command flow. No model is called. No chat, browser, phone UI or gateway
is launched, stopped or restarted. This is a command-boundary test, not a visual
Tern/phone test or an evaluation of model judgment.

The temp directory holds a full Hermes checkout (over 1 GB), so the runner
removes it on exit, pass or fail. Set `GLIDE_E2E_KEEP=1` to keep it for
inspection. Failed commands print their exit code and stop
the runner. A complete run ends with `PASS fresh-install exit=0`.

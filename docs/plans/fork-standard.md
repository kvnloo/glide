# Glide fork cutover (owner approval required)

**Do not execute until Kevin approves.** Snapshot 2026-11-21: fork `main` = `fa191dd33a2b3e56a6907cfa6e455aa88f65a5e1`; upstream `main` = `a9e805a114adf531a4a1053538aa4e316583de05`; fork ahead 1,225 / behind 31; no remote `staging`. The upstream mirror must be commit-identical, so **no README pointer on mirror `main`**. On `staging`, put fork-specific guidance in `FORK.md` and leave the upstream README plus a one-line pointer, with an explicit install link in the repo description/catalog.

## Order of operations (owner, from a clean clone)

Freeze merges and bundle publishers; save rulesets, configuration and open-PR bases. Review and land the staging-only changes to CI triggers, publisher checkout/target/bypass, artifact identity, PR instructions, and install/support links before moving main. Verify staging checks and a fresh install on the exact release commit; give the staging publisher only its own bypass. The old publisher must no longer be able to write mirror main. Inspect upstream workflows before allowing them to run: staging-specific or mirrored-main branch triggers can otherwise run unexpectedly in the same repository.

```bash
set -euo pipefail
git fetch origin refs/heads/main:refs/remotes/origin/main
git fetch https://github.com/alt-glitch/hermes-tern.git refs/heads/main:refs/remotes/upstream/main
old=$(git rev-parse origin/main)
up=$(git rev-parse upstream/main)
git rev-list --left-right --count "$old...$up"
test -z "$(git ls-remote --heads origin refs/heads/staging)"
git bundle create glide-before-fork-cutover.bundle refs/remotes/origin/main
git bundle verify glide-before-fork-cutover.bundle
git push --atomic origin "$old:refs/heads/archive/glide-main-before-cutover" "$old:refs/heads/staging"
```

After mirroring required PR checks to staging, set the GitHub **default branch to staging**; otherwise the unqualified install will silently become the upstream plugin. Default-branch changes are not a substitute for retargeting existing PRs. Before any main write:

```bash
gh api --method PATCH repos/kvnloo/glide -f default_branch=staging --jq .default_branch
for pr in 345 344 342 341 330 304 298; do
  gh pr edit "$pr" --repo kvnloo/glide --base staging
done
git ls-remote --symref origin HEAD
gh pr list --repo kvnloo/glide --state open --json number,baseRefName,headRefName
```

All seven currently target main and none of their heads are contained in it. Verify each new Files Changed view and checks (changing bases can invalidate reviews); keep #342, #330, #304 and #298 draft until disposition in `docs/REQUIREMENTS-LEDGER.md`. Do not rewrite their head refs in the cutover. Recheck PR bases and add any opened during the freeze.

Before the one non-fast-forward push, configure a short-lived owner bypass for main only and verify exact archive, staging release, catalog pin and upstream ref. Retain existing tag ancestry and do not prune or move other refs.

```bash
test "$(git ls-remote origin refs/heads/archive/glide-main-before-cutover | cut -f1)" = "$old"
test "$(git ls-remote https://github.com/alt-glitch/hermes-tern.git refs/heads/main | cut -f1)" = "$up"
git push --force-with-lease="refs/heads/main:$old" origin "$up:refs/heads/main"
test "$(git ls-remote origin refs/heads/main | cut -f1)" = "$up"
```

Remove the temporary bypass. Require staging PRs/checks, and lock main to the mirror app (fast-forward only). Verify default clone, public install and catalog install in disposable profiles; verify CI/publisher writes only staging and main remains identical to upstream. If hosted Actions are disabled or local prerequisites fail, stop before moving main.

## Install compatibility and what breaks

- `hermes plugins install kvnloo/glide` is custom GitHub shorthand. With no explicit pin and no retained pin it clones the remote default: today `main`, after the change `staging`. A GitHub URL ending in `/tree/staging` is not a Hermes branch selector. For an exact custom build, use `hermes plugins install kvnloo/glide --ref <40-character-staging-release-SHA>`.
- The reviewed catalog entry **glide** ([catalog data](https://hermes-agent.nousresearch.com/docs/api/plugin-catalog.json), [admission PR](https://github.com/NousResearch/hermes-agent/pull/153039)) uses SHA `3db11c668d3e66470d7b363680ec6a8ec5a328d9`, also reachable via the annotated `catalog-glide-0.2.0` tag. It does not track GitHub HEAD. Preserve the tag; if a later release changes tool declarations, submit updated metadata and an immutable release SHA for review. Do not move the existing tag.
- Existing unpinned Git clones/installations tracking `main` do **not** automatically switch to staging. Before rollout, publish migration notes: back up the profile, keep plugin data, reinstall from the intended reviewed pin or new staging release, verify plugin name `glide`, and check `hermes tern` plus `/glide`. Do not update the old main-tracking clone in place. Explicit main URLs and README badges/default-branch-based automation need migration; branch-specific links containing main will show upstream.
- Check ruleset/workflow branch targets, deploy key and environment bypasses, nightly job bases, release links and branch-based SHA consumers. Existing check contexts may need requalification after retargeting; don't weaken the gates to get through the move.

## Detached backup and scheduled sync

Create a **new standalone repository**, not a second network fork, after backup scope/storage approval. Keep its trusted control/default branch distinct from mirrored data. A GitHub App installation token scoped to the detached backup and Glide needs Contents write and permission to update workflow files; install only on those repositories, store the app private key as an Actions secret, and restrict the ruleset exemption to the sync app. A plain job token is insufficient for this cross-repo/workflow-file update. Disable execution of mirrored workflows: mirror heads/tags under a non-executing namespace (GitHub accepts custom refs only where supported; if not, use backup tag refs with type prefixes and do not allow tag-triggered workflows). Never use a blanket mirror push against the controller repo: it can delete the cron/default branch or start foreign workflows. Verify on a disposable destination before enrolling Glide.

Implement a scheduled and manually dispatchable action on the controller branch with per-repo concurrency. Fetch upstream heads and tags into a **fresh bare Git repo** with dedicated `refs/cache/heads/*` and `refs/cache/tags/*`. For every head/tag, append a protected archival tag such as `refs/tags/mirror/<full-ref-name-hash>/<object-id>` (store the tag object ID, not just its peeled commit). Publish verified archival refs before updating Glide. Never delete last-good refs: if upstream disappears, freezes or force-pushes, retain the archive, fail and alert. Reconstruct refs from the selected manifest and verify each archived object; store timestamped manifests of the upstream ref listing with each run, including which refs were deleted upstream, so restore is unambiguous.

With authenticated remotes named `backup` and `fork`, the core publication sequence in that fresh bare checkout is:

```bash
set -euo pipefail
git fetch --no-tags https://github.com/alt-glitch/hermes-tern.git \
  '+refs/heads/*:refs/cache/heads/*' '+refs/tags/*:refs/cache/tags/*'
git for-each-ref --format='%(objectname) %(refname)' refs/cache/heads refs/cache/tags > upstream-refs.txt
test -s upstream-refs.txt
snapshot=$(git rev-parse 'refs/cache/heads/main^{commit}')
while read -r object ref; do
  ref_id=$(printf '%s' "$ref" | git hash-object --stdin)
  git push backup "$object:refs/tags/mirror/$ref_id/$object"
done < upstream-refs.txt
git fetch --no-tags fork refs/heads/main:refs/cache/fork-main
git merge-base --is-ancestor refs/cache/fork-main "$snapshot"
git push fork "$snapshot:refs/heads/main"
test "$(git ls-remote fork refs/heads/main | cut -f1)" = "$snapshot"
```

Use a versioned manifest in the backup repository (e.g. one normal commit to the control branch when the listing changes). Verify retained Git objects are restorable with a periodic clean clone; Git ref mirroring does not back up LFS payloads, issues, releases or settings. Size-check before provisioning (>5 GB requires Kevin). GitHub can [disable public scheduled workflows on inactivity](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Schedule a low-frequency repository activity heartbeat from successful jobs, monitor last-success age independently of the job, and document re-enable/manual dispatch. If heartbeat/monitoring cannot be supported, unattended recovery from GitHub disabling the schedule is not guaranteed. No Studio or render-host cron.

## Rollback (owner only)

Freeze and disable the sync and downstream publisher first, review any new staging work, and get a temporary owner bypass. Confirm the observed mirror SHA before restoring; do not overwrite an unreviewed concurrent update. Leave staging/archival refs and the catalog tag intact.

```bash
git fetch origin refs/heads/archive/glide-main-before-cutover
restore=$(git rev-parse FETCH_HEAD)
mirror=$(git ls-remote origin refs/heads/main | cut -f1)
test -n "$mirror"
git push --force-with-lease="refs/heads/main:$mirror" origin "$restore:refs/heads/main"
gh api --method PATCH repos/kvnloo/glide -f default_branch=main --jq .default_branch
for pr in 345 344 342 341 330 304 298; do
  # Only retarget items still open; preserve new staging-only PRs for separate review.
  if test "$(gh pr view "$pr" --repo kvnloo/glide --json state --jq .state)" = OPEN; then
    gh pr edit "$pr" --repo kvnloo/glide --base main
  fi
done
git ls-remote --symref origin HEAD
```

Reinstate original branch rules, check contexts, publisher and release guidance, remove temporary bypass, and recheck public installation. PR review state and transient user installations are not automatically rolled back; communicate the recovery and re-request affected reviews.

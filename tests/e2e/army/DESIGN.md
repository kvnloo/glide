# Snapshot and lane ownership

## Progress

- Ground: traced trafficiq up.sh → snapshot → lane.sh → e2e explore → report.json → findings.py. Browser connects to a private Chrome over CDP. Existing dependencies and browser configuration are retained.
- Sketch: compared shell-only adaptation with a Python lifecycle owner behind the existing shell entry point.
- Agree: no user checkpoint needed. The brief fixes target kinds and requires autonomous completion.
- Implement: one lifecycle owner, one process owner per lane, pure aggregation and sampling functions.
- Verify: offline contracts, rendered canary checks, canonical G0, two-step Boat smokes, billing and deletion receipts.

## Usage

`KIND=kit ONLY='^kit-hosts$' CANARY=1 STEPS=2 bash boat/up.sh` freezes the kit and exact plugin revision, builds or reuses dependencies, gates on G0, runs one goal, and returns receipts.

`python3 findings.py RUN` rebuilds findings and recall. `python3 sanity.py RUN` prepares the premium review manifest and paired diff without making model calls.

## Shape

`Army` in `boat/up.py` owns created sandbox IDs from creation until verified deletion. Its `new`, `upload`, `remote`, `pull`, and `delete` operations hide Boat's JSON and transport details. Local callers supply only a goal selection and run configuration.

`boat/lane.py` owns every server/browser process for one goal and records its stage and exit. `boat/tern.py` builds the private Tern environment. `prepare_site(source, dest, enabled)` isolates injection from source. `collect(root)`, `recall(findings)`, `sample(lanes, rng)`, and `paired_diff(first, second)` are independently testable boundaries.

## Synthesis decision

The Python lifecycle owner is the base. It retains the template's snapshot-and-clone flow, dependency lock, e2e configuration, CDP browser, goal TSV, and recursive report aggregation. It replaces unbounded shell polling and best-effort traps with a recorded owner and bounded deadlines. The shell-only candidate had fewer files but exposed cleanup, JSON parsing, and budget invariants throughout the script. A generic job framework was rejected because there are only two targets and one transport.

Design alternatives were compared sequentially. No paid design panel was launched for a constrained port. The selected structure adds no framework dependency. A single run owns all its mutable output, and each remote lane writes only its own files.

## Tradeoffs

- The snapshot includes both target runtimes, so the first kit smoke also pays the plan-time cost of preparing Hermes.
- Seed detection is a conservative text match, not a substitute for premium pixel review.
- Premium re-judge is an explicit pending manifest. Infrastructure must not spend premium tokens without a separate authorized run.
- A two-step smoke proves startup and limited automation, not broad feature acceptance.

# Council sessions: one council, any client

A council started in Glide can continue on another client, such as the Hermes Android phone app or Hermex. Both apps follow this document. The example record is `glide/tests/fixtures/council-session-v1.json`. Tests on both sides of this repo read that file.

## Where a council lives

A council session is one JSON record in the Hermes profile at `<HERMES_HOME>/glide/councils/<council_id>.json`. `stored_session_id` ties it to the Hermes conversation it was started in. This is the root id of the session tree, the id `session.resume` takes. A client that resumes that conversation lists its councils and loads one. Councils belong to the profile, as conversations do. Any session attached to the profile may load and continue one. The profile keeps the newest 64.

## The record: `glide.council-session/v1`

| field | type | meaning |
|---|---|---|
| `schema` | `"glide.council-session/v1"` | |
| `council_id` | `council-` + 32 hex | the council session id |
| `stored_session_id` | string or null | the Hermes conversation (session tree root) |
| `revision` | integer ≥ 1 | +1 on every position write |
| `created_at`, `updated_at` | ISO-8601 UTC | |
| `started_by`, `updated_by` | client label `[a-z0-9][a-z0-9._-]{0,31}` | `glide`, `hermes-android`, `hermex` |
| `live` | boolean | false for the synthetic demo run. Every client keeps the DEMO tag |
| `from` | string | the endpoint host of a live run, or why the demo is shown |
| `run` | `glide.council-run/v1` | the brief, constraints, seats, events, verdicts (each seat's report) and outcome. Seats are named by id. Validate it with the client's strict run parser |
| `passages` | 1-16 of `{key, label, text, seat}` | what Read aloud speaks, in order |
| `position` | object, below | where the council is |

`passages[0].key` is always `brief`. A key is `brief`, `verdict`, `report:<slug>` or `seat:<seat-id>`. `seat` is a seat id or null. Glide writes `brief` (the brief and its constraints), then `report:verdict`, `report:agreements`, `report:dissent`, `report:abstentions` and `report:receipts`. Each passage text starts with its label: `"Dissent. Astra: …"`. The text comes from the run and never adds a verdict.

A resuming client reads the record's `passages`. It does not derive its own, because positions index into this list.

`position`:

| field | type | meaning |
|---|---|---|
| `elapsed_ms` | integer 0-86400000 | the exchange clock: ms since Convene, held while a sentence is read |
| `passage` | passage key or null | the passage being read. Null if nothing has been read yet |
| `sentence` | integer 0-999 | the sentence in that passage. A sentence index past the end means the passage is finished |
| `read_aloud`, `muted` | booleans | the reader toggles |

Sentences are split on `.`, `!` and `?`, with any closing quote kept (Glide `speechSentences`, Android `councilSentences`). A client resumes by speaking sentence `sentence` of `passage`, then the remaining sentences and passages. Glide stops after the brief when the clock has not reached the report. The visual exchange seeks to `elapsed_ms`.

## Methods

The calls go through the Hermes gateway session API. The caller is attached to a session, and `session_id` is that live session.

| method | params | answers |
|---|---|---|
| `glide.council.start` | `stored_session_id`, `client`, `live`, `from`, `run`, `passages`, `position?` | the record, `revision` 1 |
| `glide.council.list` | `stored_session_id?`, `limit?` (1-64, default 20) | `{councils: [{council_id, stored_session_id, revision, created_at, updated_at, started_by, updated_by, live, brief}]}`, newest first |
| `glide.council.load` | `council_id` | the record |
| `glide.council.position` | `council_id`, `client`, `base_revision`, `position` | the record, `revision` + 1 |

Every method also takes `session_id`. A stock Hermes core has no plugin gateway methods. It answers `-32601`. Send the same verb through the plugin command instead: `command.dispatch {name: "glide", arg: "json council.<verb> <params JSON>", session_id}`. Its `output` is the answer, or `{"error", "code"}`.

Errors: `4000` invalid, `4004` unknown council, `4090` stale write. The message on a stale write is `the council moved on: revision N is current`.

## Handoff

A position write names the revision it read. When the phone takes a council over, its first write moves the revision. Glide's next write is refused with `4090`, and Glide stops writing for that council and says so in the transcript. To take a council back, `load` it again and write from the new revision. Write when the clock starts, when a sentence starts or ends, when a toggle flips, and when the council closes. Do not write on every frame.

## Glide

`/council` starts a council session when the pane has an attached session, then opens the popup. If the start fails, the popup still opens, with a warning that the council cannot be continued elsewhere. `/council resume` opens the conversation's newest council. `/council resume <council-id>` opens a named one at its clock, toggles and sentence. `/council card` is unchanged and does not start a session.

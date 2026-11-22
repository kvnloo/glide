# Native correctness regressions (#114 #99 #90 #79 #70)

Proof type: vitest fixtures in `frontend/src/__tests__/` using the real Tern SDK `Surface`, its input
parser, the fake gateway and the pinned Hermes producers. #99 adds a PTY stress run. No native Tern
host, real key delivery, IME or live gateway was run.

| Issue | Change | Regression fixture | With the fix | Source reverted to base |
|---|---|---|---|---|
| #114 | `read-media.ts`: only an exact `content_returned: true` allows media when the flag is present. False, contradictory or malformed flags fail closed. An absent flag behaves as before | `no-content-media.test.ts` | 4 passed | 1 failed, 3 passed |
| #99 | The synthetic PTY host holds acks read during a paste until the paste ends, matching the real host fixture. A separate deterministic test pins the SDK behaviour: an ack inside a paste is literal text | `pasteAckInterleave.test.ts`, `nativeSettingsPty.test.ts` | 6 + 1 passed | n/a (test-only) |
| #90 | `overlays/rewind.tsx`: the rewind confirmation uses the shared `affirmative`/`negative` checks, so modified keys are consumed without confirming | `rewind.test.ts` | 14 passed | 2 failed, 12 passed |
| #79 | `surface/host.ts` `composerFrame`: an owner change fences composer edit, undo and send until Tern acks the frame that painted the new owner. A handler selected before a switch is rejected when it runs after it | `composerOwnerFence.test.ts` | 6 passed | 4 failed, 2 passed |
| #70 | `turn/submitOutcome.ts`: only a gateway error frame, or a request that was never written, counts as a refusal. A timeout reports an unknown outcome. A failure after a session switch waits for that session; nothing is resent | `submitOutcome.test.ts` | 9 passed | 6 failed, 3 passed |

For #79 and #70, the cases that pass on base are controls: same-owner input, a recovered
document, and the refusal classification.

## #99 stress

The PTY fixtures depend on timing; `pasteAckInterleave.test.ts` is deterministic.

- 30 serial runs of `nativeSettingsPty` + `ptyComposer` + `pasteAckInterleave`: 30 passed, 0 failed.
- 40 runs, 4 at a time on 4 CPUs: 40 passed, 0 failed.

Injecting one ack between the host's paste chunks makes `nativeSettingsPty.test.ts` fail with
"paste remains literal with command provenance: deadline expired". The pinned SDK parser treats
every byte before the paste terminator as paste text, and the protocol has no in-paste escape for
control frames. The safe contract is that the host never writes a control frame inside a paste.
Whether the real Tern host keeps that contract is not verified here.

## Assumptions to confirm on a native host

- #79: Tern sends acks and events in wire order, and acks every frame or acks cumulatively.
- #79: when B's paint is identical to A's, the host re-sends the unchanged focus so the fence has a
  frame.
- #70: a prompt held after a switch is keyed by the session's runtime id. If returning to A gives it a
  new runtime id, the text does not return to the composer.

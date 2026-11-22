# The nine October branches (#245)

Nine branches from 2026-10-20 to 10-22 predate the gateway-only launcher and were never merged
as written. Each one is ported or superseded below, with the range-diff that shows it. After the
porting PRs merge, the nine branches can be deleted; their tips stay listed here for recovery
(`git push origin <sha>:refs/heads/<name>`).

`git range-diff <merge-base>..origin/<branch> <landing range>` compares each branch's commits with
the commits that carry them now. `!` means matched with edits, `<` means folded into another
commit, and `>` means a new commit.

| Branch | Tip | Disposition | Where it is now | Range-diff |
| --- | --- | --- | --- | --- |
| `fix/a11y-native-buttons` | be51c1d | Landed | f8721ad (11-10 merge f9fc65f) | `1: be51c1d ! 1: f8721ad`. Only the STYLES snapshot hash and the context lines differ |
| `feat/session-tree` | d0c4cc6 | Landed | 6614a57, then 7611042 | `1: d0c4cc6 ! 1: 6614a57`. Same change; `lastReply` is now imported from `sessionIndex` |
| `feat/rewind-sheet` | eadb1d1 | Landed | 9da102f | `1: eadb1d1 ! 1: 9da102f`. Only the README context line differs |
| `feat/composer-dictation` | 0613729 | Superseded | 904ecc5 (re-ported dictation helper, recorder and tests) | `1: 0613729 ! 1: 904ecc5`. Re-ported in a later form; `dictation.py`, `draft/dictation.ts` and `hermes/dictation.ts` are in main |
| `wip/feat/composer-dictation-20261105` | 5509fc8 | Superseded | 904ecc5 | `1: 5509fc8 ! 1: 904ecc5`. Earlier copy of the branch above |
| `feat/ripple-controls` | cd5d073 | Ported | `boat/glide-ask-control/gl-007` | `1: 2e9858c ! 1: 7c69d5f`; the README and fake-model commits fold into it |
| `feat/tern-render-hints` | 85b48dd | Superseded by upstream, then ported | alt-glitch/hermes-tern#64 (f5f839b) and #111 (52acbce), picked onto `boat/glide-ask-control/gl-084` | `1: 7aeb084 ! 1: f5f839b`, `2: 85b48dd <` (its skill removal is part of #64) |
| `fix/media-stream-bound` | 8250bb9 | Ported | `boat/glide-ask-control/gl-084` (also upstream PR 72, open) | `1: 8250bb9 ! 1: 19ecd61`. Body reading is adapted to the fork's async-iterable public fetch |
| `fix/media-session-lifetime` | ba21429 | Ported | `boat/glide-ask-control/gl-084` (also upstream PR 73, open) | `2: ba21429 ! 1: 19ecd61`, `1: 8250bb9 <` (stacked on the branch above) |

Full tips:

- `fix/a11y-native-buttons` be51c1d601eb1aa8e49d1ced6a51f0c21f8c9f25
- `feat/session-tree` d0c4cc683484e381ef37ba7db67f674eca49c729
- `feat/rewind-sheet` eadb1d1e14d501df4ef52533d5b5af807730292e
- `feat/composer-dictation` 0613729fb21b2c8b2f10699662736b2d1aff64a0
- `wip/feat/composer-dictation-20261105` 5509fc842fc959f78ad47790f1b52d5106589ba9
- `feat/ripple-controls` cd5d073beb00d9c5858a8795a1d0af54f16c9ee9
- `feat/tern-render-hints` 85b48ddd85b0011b7de1abee2d5421a5e2a167bc
- `fix/media-stream-bound` 8250bb93e06258e10685c073f67aa357a529f756
- `fix/media-session-lifetime` ba21429a3a6ba32d5d8e246c6c0040c2702371f9

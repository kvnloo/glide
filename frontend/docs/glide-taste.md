# Open a Taste brainstorm beside chat

1. Enable the Glide plugin in your Hermes profile.
2. Start your existing Taste Atlas app with `node scripts/board.mjs serve` from the app directory.
3. In a local Tern chat, run `/glide taste`.

The command opens the newest brainstorm board beside the current chat. With no boards, it opens
the Boards view. A receipt appears only after Tern confirms the browser block. Close the browser
pane with Tern's normal controls. Nothing opens at startup, and corrections memory stays unchanged.

`GLIDE_TASTE_URL=http://127.0.0.1:<port>` selects another local server. Set this variable in Hermes'
environment, not the chat. Credentials, remote origins, query strings, and redirects are refused.
Keep private reference data in the Atlas server's existing data directory. No data is bundled here.
The board can load the external reference images it already contains.

The frontend calls `glide.taste`, or `/glide json taste {}` through `command.dispatch` on older cores.
Glide checks the server and returns its local board URL. Tern validates the reply before opening a
native browser block. Late replies from a replaced session do not open panes. This does not grant
agent browser-drive consent or enable the plugin's browser-control backend.

Outside a local Tern pane, the command reports that the pane is unavailable. Text-only Glide
frontends return the board link. If the server is down, the error names the server command.

Run the focused checks from `frontend`:

```sh
bun run test src/__tests__/glideCommand.test.ts src/__tests__/glideTaste.test.ts src/__tests__/tastePane.test.ts
```

In an owned isolated Tern display, verify the real plugin, server, and native browser together:

```sh
GLIDE_SOURCE=/path/to/glide GLIDE_TASTE_VERIFY_ISOLATED=1 bun scripts/verify-glide-taste.ts
```

The script requires the test pane's `TERN_PANE` and daemon environment. It uses a temporary Hermes
profile, checks that the native board finishes loading, closes its browser block, and removes the
profile. Do not run it on another person's desktop. It prints no private board content.

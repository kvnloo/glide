# Open fframestudio from Glide

1. Install the existing fframestudio app and its dependencies.
2. Link its optional Tern add-on with `tern plugin link /path/to/fframestudio/tern`.
   If you do not link it, set `GLIDE_STUDIO_DIR=/path/to/fframestudio` in the Glide process environment.
3. In a local Tern chat, run `/glide studio` to open the library.
4. To open a project and preview its layers, run `/glide studio <project-id>`.

Glide opens the linked add-on in a native pane when Tern reports it ready.
Otherwise, Glide opens the existing web editor in a Tern browser pane.
The app's existing launcher reuses a healthy bridge or starts its bridge on request.
No studio or agent starts when Glide starts.

The native `glide/v1` card changes from opening to open only after the launch command succeeds.
It shows the credential-free editor URL and a read-only scene-to-layer preview.
Project selection is explicit. `GLIDE_STUDIO_PROJECT` supplies a default project ID.
With no selection, the card explains how to select a project instead of guessing which one is open.
Run the command again after changing projects or editing layers. The preview does not track browser navigation.

The preview uses fframestudio's canonical project migration to read both project versions 0 and 1.
Scene membership comes from `videos[].scenes[].clipIds`. Clips supply their media and attached text or audio layers.
Ungrouped clips appear under their own scene headings. The card shows at most 80 layers and reports any omitted layers.
The preview never saves the project or starts an ACP assistant.

Bridge discovery, authentication, startup locking, and private browser-control files come from fframestudio's existing add-on helpers.
`FFS_BRIDGE_FILE` selects an already-running externally managed bridge, with auto-start disabled by the app.
Glide never puts the bridge token in a card, process arguments, or a shared screenshot.
A missing local Tern pane produces an error card with the safe URL. It never opens a desktop browser automatically.

## Verify the integration

Run the focused behavior tests from `frontend`:

```sh
bun run test src/__tests__/studio.test.ts src/__tests__/studioCommand.test.ts
bun run typecheck
bun run lint
```

Set `GLIDE_STUDIO_DIR`, `GLIDE_STUDIO_CONTROL`, `TERN_DAEMON_SOCKET`, `TERN_CONFIG_DIR`,
`XDG_RUNTIME_DIR`, and `WAYLAND_DISPLAY` to the existing app and an owned headless studio.
Never point this check at the user's desktop. Set `GLIDE_STUDIO_GEOMETRY` to the isolated window's rectangle when needed.
Then run from the repository root:

```sh
bash glide/tools/verify-studio.sh glide/docs/proofs/studio
```

The launcher takes `/tmp/glide-studio-heavy.lock`, waits for more than 6 GiB of available memory,
and bundles the typechecked `frontend/scripts/verify-studio.ts` controller.
The controller creates a synthetic project, an owned bridge, and a disposable Tern session.
It focuses that session, types the real command, inspects Tern's native layer tree,
checks that the project file is unchanged, and captures two stills and an MP4.
For the web fallback it waits for the credential-free URL before recording or capturing the editor.
The native recording includes typing the command; the web recording starts after authentication.
It closes the owned session and bridge after the check. It does not query a model.
Full suites run through the fleet-runner CI mirror.

# Post-merge App smoke: rotating GLB (#35)

The normal frontend suite boots a real `App` with a fake Gateway and Tern surface. It verifies browser focus, refusal of image previews without authenticated tool evidence, and a model split from a simulated Meshy completion. It also checks timer cleanup.

To check the rendered model in the same App run, first set up the frontend as described in [frontend development](../../frontend/README.md). On Linux with headless Chrome and SwiftShader support, run from the repository root:

```sh
(
  set -eu
  deps="$(mktemp -d)"
  trap 'rm -rf "$deps"' EXIT
  npm install --prefix "$deps" --no-audit --no-fund three@0.180.0
  chrome="$(command -v google-chrome)"
  cd frontend
  GLIDE_SMOKE_NODE_MODULES="$deps/node_modules" GLIDE_SMOKE_CHROME="$chrome" \
    bun run test src/__tests__/postmergeSmoke.test.ts
)
```

The browser observer consumes the file argument recorded at `tern open --split right`. Three.js parses the embedded [CC0 GLB](../tools/fixtures/BoxVertexColors.md), draws it with WebGL, and reads pixels at two fixed phases of a Y-axis turn. Both poses must draw non-background pixels, the repeated first pose must be identical, and the rotated image must differ. Fixed phases avoid timing and GPU speed as sources of test flakiness. Three.js is installed only for this opt-in run, not shipped in Glide.

The test does not call Meshy, use a live Hermes gateway, or render a native secondary Tern pane. For native verification, open a fresh Glide chat in Tern on macOS. With Meshy configured, ask Hermes to generate and download a model as an embedded GLB. Confirm the tool result opens exactly one 3D split to the right of that same chat. Drag the model in the pane to orbit it; record a short capture showing the model changing orientation and the chat still visible. To isolate the native renderer from Meshy, use `/view3d` with the absolute path to the checked-in BoxVertexColors.glb.

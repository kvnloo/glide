## Tokens

| Token | Normal | Turbo | Use |
|---|---:|---:|---|
| `press` | 70 ms | 60 ms | *Press depress*: scale to `PRESS_SCALE` (row 0.985, control 0.92, nav 0.9) |
| `fade` / `crossfade` / `MOTION_MS.crossfade` | 120 ms | 100 ms | Opacity, exits, status surfaces, the reduce-motion crossfade |
| `nav` | 140 ms | 120 ms | One page of the tab pager |
| `snappy` | 150 ms | 100 ms | Default open, toggles, the mic pill |
| `settle` | 180 ms | 120 ms | Gesture release, and the ceiling for distance-based durations |
| `MOTION_MS.enter` / `exit` | 150 / 120 ms | 0 / 0 | Layout enter and exit builders (`enterUp`, `popIn`, `fadeOut`) |

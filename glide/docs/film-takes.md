# Film take checklist (isolated studio)

Takes for the launch film (#346) come from the owned headless studio, `glide/tools/studio.sh`
(formerly `lab/studio.sh`). It runs its own sway at 1920x1080@60, never the user's display.

1. Start the studio: `glide/tools/studio.sh up`. Wait for `studio: up` and check that the pane
   shows the studio's Glide composer before staging the beat.
2. Record: `glide/tools/studio.sh rec take.mp4 SECS`. Leave `STUDIO_FPS` unset: takes are
   60 fps by default. `STUDIO_FPS=30` records a 30 fps take on purpose; it is not a film take.
3. Capture check. `rec` runs it on the take when recording stops and exits non-zero on failure:

   ```sh
   glide/tools/studio.sh check take.mp4   # ffprobe avg_frame_rate must be within 0.5 of 60
   ```

   `studio: take ok take.mp4: 60.00 fps (...)` passes. `studio: REJECT take ...` means the
   take is not 60 fps: discard it and record again. Do not re-tag or re-time a 30 fps take.
4. Watch the whole take. The check proves the frame rate, not smooth motion or framing.
5. Note the take path and the Glide commit with the take.
6. Stop the studio: `glide/tools/studio.sh down`.

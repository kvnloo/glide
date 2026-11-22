# Launch Glide with Ctrl+L

Install and enable Glide first, and confirm `hermes tern` works inside a native Tern pane.
The desktop binding starts a new Tern window with a fresh Glide pane (`--new`),
using the normal Hermes profile. It does not start the isolated film studio.

## Linux · Hyprland

In the active Hyprland Lua config, add this alongside the other bindings
(on .files, use a local override loaded by `hyprland.lua` so the generated binds stay untouched):

```lua
hl.bind("CTRL + L", hl.dsp.exec_raw("exec", "tern -e hermes tern --new"))
```

For a config still using Hyprland's legacy syntax, use this instead:

```ini
bind = CTRL, L, exec, tern -e hermes tern --new
```

Test `tern -e hermes tern --new` from your desktop shell first. If Hyprland's
launcher cannot find either executable, replace its name in the binding with its
absolute path. Run `hyprctl reload`, then press **Ctrl+L** from the desktop.

## macOS · skhd

With Tern installed as an app and skhd enabled with Accessibility permission,
add this to the active `skhdrc` (the .files source is `config/skhd/skhdrc`):

```skhd
ctrl - l : open -na Tern --args -e /path/to/hermes tern --new
```

Replace `/path/to/hermes` with the absolute executable path from `command -v hermes`;
quote the path if it contains spaces. Test the resulting `open` command in a shell
before installing the binding. Reload with `skhd --reload` and press **Ctrl+L**.

On either desktop, the new window should show Glide's **Ask Hermes** composer,
not a plain shell. Pressing the shortcut again should open another fresh pane.
The binding is opt-in and global: it takes priority over app shortcuts for
**Ctrl+L**, including Glide's live-voice toggle. Use **Alt+Shift+V** for live
voice while this binding is active. To restore app handling of **Ctrl+L**,
remove the binding and reload the hotkey configuration.

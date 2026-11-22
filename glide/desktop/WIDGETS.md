# Put a Glide focus timer in Hermes Desktop chat

Install and enable the Glide agent plugin in your profile. From this checkout run
`python3 glide/desktop/install.py "$INSTALLED_GLIDE" "$HERMES_ROOT/desktop-plugins"`
with the installed plugin directory containing `plugin.yaml` and the app-level
Hermes root. Restart the backend and Desktop, and enable the Desktop plugin in
**Capabilities → Plugins** if necessary.

In the main Desktop chat ask: “Add a 25-minute Glide focus timer above this composer
using glide_ui_mount, with the time left and a meter.” The expected tool arguments are:

```json
{
  "id": "focus",
  "slot": "above-composer",
  "source": "clock.focus",
  "minutes": 25,
  "program": "root = GlideCard(\"focus\", [Hero(\"left\"), Meter(\"meter\")])"
}
```

Desktop reads the profile's persistent Glide widget state. The same profile timer can
appear in more than one composer; it is not keyed to a chat session. It keeps ticking
and survives reload from its saved start time. Ask Glide to
unmount the widget, or use `/glide ui reset` to clear all Glide UI customizations.
The tool's Tern validation receipt is separate: without Tern, its result can say
“saved, unchecked” while Desktop shows the supported widget.

Desktop accepts the flat `clock.focus` preset with `Hero("left")`, `Meter("meter")`,
and/or `Badges("state")`. A Tern `composer-ring` timer is displayed as a banner
with a meter: Desktop doesn't expose a composer border contribution. Other sources,
slots, and arbitrary programs/styles are not evaluated. This is a visual countdown,
not the attention guard's deep-work block.

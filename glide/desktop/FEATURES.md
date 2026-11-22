# Glide in Hermes Desktop

Glide shares corrections memory, deep-work state, and the attention card with the CLI
and Tern. Desktop uses the stock runtime-plugin SDK and authenticated profile REST
routes; there is no Hermes Desktop fork or separate settings store.

1. Install and enable the Glide agent plugin normally (full or standalone) from
   this revision. Find the installed directory containing its `plugin.yaml`.
2. From this checkout run:
   `python3 glide/desktop/install.py "$INSTALLED_GLIDE" "$HERMES_ROOT/desktop-plugins"`.
   Use the app-level Hermes root, not a profile directory, for the second argument.
3. Restart the backend and Desktop. Enable Glide in Desktop's **Capabilities → Plugins**
   if necessary, then open **Settings → Plugins → Glide**.
4. Build the local index, search for a known correction, and optionally turn on
   automatic recall. Start a focus block and stop it to release the held digest.

The Desktop settings page is profile-wide, like the CLI commands. The attention card
shows the current phase, guard and queue; Refresh reconciles actions taken elsewhere.
Remove the staged `desktop-plugins/glide` directory to remove the UI without deleting
memory. This companion needs a Desktop build with runtime plugins and profile REST.

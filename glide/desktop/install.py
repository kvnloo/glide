"""Stage the Desktop companion for an already-installed, trusted Glide agent plugin."""

import argparse
from pathlib import Path
from shutil import copy2

HERE = Path(__file__).resolve().parent


def install(agent_plugin: Path, desktop_plugins: Path) -> None:
    package = agent_plugin / "glide" if (agent_plugin / "glide" / "core.py").is_file() else agent_plugin
    if not (agent_plugin / "plugin.yaml").is_file() or not (package / "core.py").is_file():
        raise ValueError("Pass the installed Glide directory containing plugin.yaml")
    backend = package / "desktop"
    backend.mkdir(exist_ok=True)
    dashboard = agent_plugin / "dashboard"
    dashboard.mkdir(exist_ok=True)
    modules = []
    for name in ("features", "widgets"):
        # Assembling from the same checkout ensures the renderer matches its API.
        frontend = HERE / f"{name}.js"
        api = HERE / f"{name}_api.py"
        if not (frontend.is_file() and api.is_file()):
            continue
        if api.resolve() != (backend / api.name).resolve():
            copy2(api, backend / api.name)
        modules.append(f"  {{\n{frontend.read_text()}\n    register(ctx)\n  }}")
    for source in (HERE / "dashboard").iterdir():
        if source.name in {"manifest.json", "plugin_api.py"} and source.resolve() != (dashboard / source.name).resolve():
            copy2(source, dashboard / source.name)
    target = desktop_plugins / "glide"
    target.mkdir(parents=True, exist_ok=True)
    (target / "plugin.js").write_text(
        "import { atom, host, useValue } from '@hermes/plugin-sdk'\n"
        "import { createElement as h, useEffect, useState } from 'react'\n"
        "export default { id: 'glide', name: 'Glide', register(ctx) {\n"
        + "\n".join(modules)
        + "\n} }\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("agent_plugin", type=Path, help="installed Glide agent plugin directory")
    parser.add_argument("desktop_plugins", type=Path, help="Desktop plugin root for the app")
    args = parser.parse_args()
    install(args.agent_plugin, args.desktop_plugins)

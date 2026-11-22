"""Hermes loads this file directly, not as part of the agent plugin package."""

from importlib import import_module
from pathlib import Path
import sys
from types import ModuleType

from fastapi import APIRouter

router = APIRouter()
installed = Path(__file__).resolve().parents[1]
package = installed / "glide" if (installed / "glide" / "core.py").is_file() else installed
# Bind relative imports to this installed copy, not a similarly named pip package.
namespace = f"{__name__}_backend"
backend = ModuleType(namespace)
backend.__path__ = [str(package)]
sys.modules[namespace] = backend

for surface in ("features", "widgets"):
    if (package / "desktop" / f"{surface}_api.py").is_file():
        api = import_module(f"{namespace}.desktop.{surface}_api")
        router.include_router(api.router, prefix="/desktop")

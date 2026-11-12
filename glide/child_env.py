"""The environment Glide hands a child process: the basics plus only the names that tool needs.

A child never inherits the whole parent environment, which holds provider API keys and tokens.
Stdlib only, so ``fleet.py`` can import it when it runs as a script.
"""

from __future__ import annotations

import os
from collections.abc import Iterable, Mapping

BASE = ("PATH", "HOME", "LANG", "LC_ALL", "LC_CTYPE", "TZ", "TMPDIR", "XDG_CONFIG_HOME", "XDG_CACHE_HOME")


def child_env(names: Iterable[str] = (), extra: Mapping[str, str] | None = None) -> dict[str, str]:
    """``BASE`` and ``names`` copied from this process where set, then ``extra`` on top."""
    env = {name: os.environ[name] for name in (*BASE, *names) if name in os.environ}
    env.setdefault("PATH", os.defpath)
    return {**env, **(extra or {})}

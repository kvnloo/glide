"""Route sample agent asks through Glide's attention guard, as an agent or cron job would.

    HERMES_HOME=<profile dir> python demo/hold.py

During a deep-work block (or a guarded circadian phase) they are held for the end-of-block
digest; critical ones would pass. Synthetic text only.
"""

import importlib.util
import os
import sys
from pathlib import Path

ASKS = [("PR #12 is ready for your review", "decision"), ("Nightly eval finished: 3 regressions", "report"),
        ("Docs build warning in CHANGELOG.md", "digest")]


def plugin():
    root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("glide_demo", root / "__init__.py", submodule_search_locations=[str(root)])
    module = importlib.util.module_from_spec(spec)
    sys.modules["glide_demo"] = module
    spec.loader.exec_module(module)
    from glide_demo import attention  # noqa: E402

    return attention


def main() -> None:
    attention = plugin()
    home = Path(os.environ["HERMES_HOME"])
    for title, cls in ASKS:
        out = attention.route(home, title, cls=cls)
        print(f"{cls:8} {'delivered' if out['deliver'] else 'held (' + out['reason'] + ')'}: {title}")


if __name__ == "__main__":
    main()

"""Seed a Hermes profile with synthetic sessions for a /glide demo. No real data.

    HERMES_HOME=<profile dir> python demo/seed.py [--rhythm]

--rhythm adds ten days of short synthetic work sessions (busy 09:00-11:00 and 14:00-15:00 local,
last message near 22:40) so `/glide focus hours` has a work rhythm to learn from.

Writes through Hermes' own SessionDB, so the rows match what real chats store.
"""

import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

from hermes_state import SessionDB

SESSIONS = [
    ("cli", [
        ("user", "Set up the frontend build for the dashboard repo."),
        ("assistant", "Running npm install and adding a build script."),
        ("user", "no, use pnpm for the frontend, never npm. The lockfile is pnpm-lock.yaml."),
        ("assistant", "Switched to pnpm."),
    ]),
    ("tui", [
        ("user", "Ship the release branch."),
        ("assistant", "Pushing straight to main."),
        ("user", "Correction: never push to main. Open a PR and wait for CI to pass."),
    ]),
    ("cli", [
        ("user", "Write the migration for the users table."),
        ("assistant", "Here is the migration with tabs for indentation."),
        ("user", "actually, our SQL files use two spaces, not tabs."),
    ]),
    ("desktop", [
        ("user", "Deploy the API."),
        ("assistant", "Deploying to production."),
        ("user", "no, always deploy to staging first and run the smoke tests there."),
    ]),
    ("tui", [
        ("user", "Commit these changes."),
        ("assistant", "Committed."),
        ("user", "actually, sign every commit with my SSH key (git commit -S)."),
    ]),
    ("cron", [  # Not a local chat: glide skips it.
        ("user", "no, this nightly job text is not a correction from you."),
    ]),
]


RHYTHM = [(9, 5), (9, 25), (9, 45), (10, 5), (10, 30), (10, 50), (14, 10), (14, 30), (14, 50), (22, 40)]
ASKS = ["Refactor the tokenizer into its own module.", "Add a test for the empty input case.",
        "Profile the parser on the large fixture.", "Draft the release notes for the parser change."]


def rhythm(db, days: int = 10) -> int:
    """Short synthetic sessions on a steady daily rhythm, local time, ending yesterday."""
    today = datetime.now().astimezone().replace(hour=0, minute=0, second=0, microsecond=0)
    for d in range(days, 0, -1):
        day = today - timedelta(days=d)
        sid = f"glide-rhythm-{d}"
        db.create_session(sid, "cli")
        for k, (hour, minute) in enumerate(RHYTHM):
            db.append_message(sid, "user", ASKS[k % len(ASKS)],
                              timestamp=day.replace(hour=hour, minute=minute).timestamp())
    return days


def main() -> None:
    home = Path(os.environ["HERMES_HOME"])
    db = SessionDB(db_path=home / "state.db")
    start = time.time() - 86_400 * len(SESSIONS)
    try:
        days = rhythm(db) if "--rhythm" in sys.argv[1:] else 0
        for i, (source, turns) in enumerate(SESSIONS):
            sid = f"glide-demo-{i}"
            db.create_session(sid, source)
            for j, (role, text) in enumerate(turns):
                db.append_message(sid, role, text, timestamp=start + i * 86_400 + j * 60)
    finally:
        db.close()
    print(f"seeded {len(SESSIONS)} synthetic sessions" + (f" and {days} rhythm days" if days else "")
          + f" into {home / 'state.db'}")


if __name__ == "__main__":
    main()

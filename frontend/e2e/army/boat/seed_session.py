"""Seed only the owned test DB through Hermes' public session API. No model turn."""
import json
import os
from pathlib import Path

from hermes_state import SessionDB


def main():
    home = Path(os.environ['HERMES_HOME']).resolve()
    if home != Path('/home/user/army-private/hermes'):
        raise RuntimeError('refuse to seed any non-lane database')
    session = 'army-synthetic-transcript'
    cards = [{'kind': 'ride', 'app': 'uber'}, {'kind': 'merge', 'app': 'github'},
             {'kind': 'receipt', 'app': 'stripe'},
             {'kind': 'fleet-hosts', 'app': 'k3s'},
             {'kind': 'fleet-portfolio', 'app': 'dash'},
             {'kind': 'fleet-factory', 'app': 'aodl'}]
    db = SessionDB(home / 'state.db')
    try:
        db.create_session(session, 'cli', model='google/gemma-4-31b-it',
                          cwd='/home/user/glide')
        db.append_message(session, 'user', 'Show the authored card examples and explicit fleet unavailable states.')
        db.append_message(session, 'assistant', '\n\n'.join(
            '```ephemeral-ui\n' + json.dumps(card) + '\n```' for card in cards))
    finally:
        db.close()
    print(session)


if __name__ == '__main__':
    main()

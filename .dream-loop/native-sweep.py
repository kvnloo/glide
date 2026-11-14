#!/usr/bin/env python3
"""Unvalidated sweep prototype. Deploy on MBP beside native-baseline-retry.py."""
import importlib.util
import json
from pathlib import Path
import subprocess
import time

spec = importlib.util.spec_from_file_location('baseline', Path(__file__).with_name('native-baseline-retry.py'))
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)


def sweep(ctl, receipt, out):
    gaps = receipt['gaps'] = []

    def wait_for(needle, seconds=45):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            tree = ctl('tree')
            if needle in tree:
                return tree
            time.sleep(.25)
        (out / ('missing-' + str(len(gaps)) + '.tree.json')).write_text(tree)
        raise RuntimeError('State never showed ' + needle)

    def ask(text):
        ctl('type', json.dumps(text))
        ctl('key', 'Enter')

    def shot(name, needle=None):
        # Retry note requires waiting, not failing early, after a mid-round dip.
        for attempt in range(46):
            if baseline.memory() >= baseline.THRESHOLD:
                break
            if attempt == 45:
                raise RuntimeError('Memory stayed below 4 GiB for 45 minutes')
            time.sleep(60)
        tree = wait_for(needle) if needle else ctl('tree')
        (out / (name + '.tree.json')).write_text(tree)
        ctl('wait', '600')
        ctl('shot', name)
        receipt['captures'].append(name)
        print('captured ' + name, flush=True)

    def journey(name, command, needle, close=False):
        try:
            ask(command)
            shot(name, needle)
        except Exception as error:
            gaps.append({'surface': name, 'reason': str(error)})
            print('gap ' + name + ': ' + str(error), flush=True)
        finally:
            if close:
                ctl('key', 'Escape')
                ctl('wait', '300')

    journey('transcript', 'tool', 'tool-ok')
    time.sleep(3)
    shot('populated-transcript')
    journey('council-brief', '/council', 'Socratic council')
    ctl('record', 'start', 'council-motion', 'fps', '15')
    ctl('key', 'Enter')
    time.sleep(3)
    ctl('record', 'stop')
    shot('council-seats', 'data-council-seat')
    time.sleep(35)
    shot('council-report', 'Ship the plugin first')
    ctl('key', 'Escape')
    journey('council-receipt', '/council card', 'Open the council')
    journey('focus-card', '/glide focus', 'Your attention')
    journey('focus-running', '/glide focus 25', 'Deep-work block on')
    journey('focus-clean', '/glide focus clean', 'min left', close=True)
    ask('/glide focus stop')
    journey('agents-tree', 'delegate slow', 'delegate')
    journey('agents-popup', '/agents', 'agent', close=True)
    # Let the deterministic delegated tools finish before opening preference sheets.
    time.sleep(30)
    for name, command, needle in [
        ('theme-picker', '/theme', 'Dash'),
        ('model-picker', '/model', 'fake-model'),
        ('settings', '/settings', 'Settings'),
        ('sessions', '/sessions', 'session'),
    ]:
        journey(name, command, needle, close=True)
    journey('sidebar', '/sidebar', 'sf-prefs')
    ask('/sidebar')
    for name, command, needle in [
        ('hosts', '/hosts', 'atlas'),
        ('portfolio', '/portfolio', 'Glide'),
        ('factory', '/factory graph', 'factory'),
        ('intel-hill', '/intel hill', 'hill'),
        ('intel-skills', '/intel skills', 'skill'),
        ('intel-memory', '/intel memory', 'memory'),
        ('intel-failures', '/intel failures', 'failure'),
        ('intel-trace', '/intel trace', 'trace'),
        ('taste', '/glide taste', 'Taste'),
        ('lanes', '/glide lanes', 'lane'),
    ]:
        journey(name, command, needle, close=name == 'lanes')
    (out / 'sweep.json').write_text(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    import socket
    fixture = baseline.ROOT / 'fixtures'
    def port():
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            return sock.getsockname()[1]
    taste_port, lanes_port = port(), port()
    fixture_env = dict(
        GLIDE_FLEET_FIXTURE=str(fixture / 'fleet-fixture'),
        GLIDE_FACTORY_OPS=str(fixture / 'factory-ops'),
        GLIDE_INTEL_OPS=str(fixture / 'intel/ops'),
        GLIDE_INTEL_CLIMBS=str(fixture / 'intel/*hillclimb*'),
        GLIDE_INTEL_MEMORY_ROOT=str(fixture / 'intel/memory'),
        GLIDE_INTEL_EVENT_LOG=str(fixture / 'intel/events.jsonl'),
        GLIDE_INTEL_LAWS=str(fixture / 'intel/laws.json'),
        Z0INT_STATE_PACKET=str(fixture / 'intel/memory/STATE-PACKET.md'),
        GLIDE_TASTE_URL=f'http://127.0.0.1:{taste_port}',
        GLIDE_LANES_URL=f'http://127.0.0.1:{lanes_port}',
        GLIDE_LANES_TOKEN_FILE=str(fixture / 'lanes.token'),
    )
    (fixture / 'lanes.token').write_text('synthetic-w8-only')
    lanes = (fixture / 'fake-lanes.py').read_text()
    assert lanes.count('8797') == 1
    script = fixture / 'owned-lanes.py'
    script.write_text(lanes.replace('8797', str(lanes_port)))
    children = []
    try:
        for command, name in [(['python3', str(fixture / 'taste-stub.py'), str(taste_port)], 'taste'), (['python3', str(script)], 'lanes')]:
            log = open(fixture / (name + '.log'), 'w')
            children.append(subprocess.Popen(command, stdout=log, stderr=log))
        time.sleep(.5)
        if any(child.poll() is not None for child in children):
            raise RuntimeError('An owned synthetic fixture server failed to bind')
        raise SystemExit(baseline.main(sweep, fixture_env))
    finally:
        for child in children:
            if child.poll() is None:
                child.terminate()
                child.wait(timeout=10)

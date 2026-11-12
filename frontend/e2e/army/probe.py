#!/usr/bin/env python3
"""Run the canonical probe, then enforce its actual tool and schema responses."""
import contextlib
import io
import json
import os
from pathlib import Path
import runpy
import sys
import urllib.request


def probe(script, screenshot, model):
    if os.environ.get('E2E_KEY_ENV', 'NVIDIA_API_KEY') != 'NVIDIA_API_KEY':
        raise ValueError('canonical G0 requires NVIDIA_API_KEY from with-keys.sh')
    replies, errors = [], []
    output = io.StringIO()
    original = urllib.request.urlopen

    def capture(*args, **kwargs):
        try:
            with original(*args, **kwargs) as response:
                data = response.read()
        except urllib.error.HTTPError as error:
            body = error.read().decode(errors='replace')[:1000]
            body = body.replace(os.environ.get('NVIDIA_API_KEY', '<no-key>'), '<redacted>')
            errors.append({'http_status': error.code, 'body': body})
            raise
        replies.append(json.loads(data))
        return io.BytesIO(data)

    argv = sys.argv
    try:
        urllib.request.urlopen = capture
        sys.argv = [str(script), str(screenshot), model]
        # Canonical output truncates tool JSON. Do not infer pass from its printed text.
        with contextlib.redirect_stdout(output):
            runpy.run_path(str(script), run_name='__main__')
    finally:
        urllib.request.urlopen = original
        sys.argv = argv
    if len(replies) != 2:
        raise ValueError('G0 provider failed: ' + json.dumps(errors) + ' ' + output.getvalue().strip())
    tool, plan = [reply['choices'][0]['message'] for reply in replies]
    calls = tool.get('tool_calls') or []
    if not calls or calls[0]['function']['name'] != 'click':
        raise ValueError('G0 image/tool response did not call click')
    label = json.loads(calls[0]['function']['arguments']).get('label', '')
    if not isinstance(label, str) or not label.strip():
        raise ValueError('G0 image response did not identify a button')
    data = json.loads(plan.get('content') or 'null')
    if not isinstance(data, dict) or set(data) != {'kind', 'title'} or data['kind'] not in ('step', 'finish') or not isinstance(data['title'], str) or not data['title'].strip():
        raise ValueError('G0 json_schema response did not match the planner schema')
    return {'passed': True, 'model': model, 'image': str(screenshot),
            'image_tool_label': label, 'plan': data, 'checks': ['image', 'tool', 'json_schema']}


if __name__ == '__main__':
    script, screenshot, model = sys.argv[1:]
    result = probe(Path(script), Path(screenshot), model)
    Path('runs/g0/probe.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result))

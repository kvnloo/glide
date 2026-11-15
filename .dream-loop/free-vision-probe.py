#!/usr/bin/env python3
"""Run the installed G0 probe on an explicitly free model. Never print credentials."""
import json
import os
from pathlib import Path
import runpy
import sys
import time
import urllib.error
import urllib.request

from PIL import Image

sys.path.insert(0, '/home/kvn/zer0/oss/hermes-jev-skills')
sys.path.insert(0, '/home/kvn/.hermes/hermes-agent')
from hermes_cli.config import get_env_value
from hermes_cli.auth import read_credential_pool
from jevkit.catalog import models
from jevkit.keystore import _from_file

model = sys.argv[1]
assert model.endswith(':free'), 'Only explicitly free models are authorized'
eligible = [row for row in models() if row['provider'] == 'openrouter' and row['model'] == model and row['price'] == 0 and row['vision']]
assert eligible, 'Model is not in the available zero-cost vision catalog'
key = get_env_value('OPENROUTER_API_KEY') or _from_file('openrouter')
if not key:
    eligible_rows = [row for row in read_credential_pool('openrouter') if row.get('auth_type') == 'api_key' and row.get('last_status') in (None, 'ok') and row.get('access_token') and (row.get('model_cooldowns') or {}).get(model, 0) <= time.time()]
    key = eligible_rows[0]['access_token'] if eligible_rows else None
    print('credential_source=read-only Hermes pool' if key else 'credential_source=absent', flush=True)
if not key or key.lstrip().startswith(('${', 'op://', 'bws://')):
    raise SystemExit('No usable OpenRouter credential is configured')
os.environ.update(OPENROUTER_API_KEY=key, PROBE_KEY_ENV='OPENROUTER_API_KEY', E2E_BASE_URL='https://openrouter.ai/api/v1', PROBE_EXPECT='fake-model,medium')
root = Path(__file__).resolve().parent
image = root / 'native/verified-startup/serve/welcome-preview.png'
jpeg = root / 'native/verified-startup/serve/welcome-probe.jpg'
Image.open(image).convert('RGB').save(jpeg, quality=85)
original = urllib.request.urlopen

def limited(request, *args, **kwargs):
    try:
        return original(request, *args, **kwargs)
    except urllib.error.HTTPError as error:
        if error.code == 429:
            raw = error.read(2048).decode('utf-8', 'replace').replace(key, '<redacted>')
            try:
                detail = json.dumps({'error': json.loads(raw)['error']})
            except (ValueError, KeyError):
                detail = 'Unreadable rate-limit response'
            reset = error.headers.get('X-RateLimit-Reset')
            raise SystemExit('Free route rate limited. Retry-After=' + str(error.headers.get('Retry-After')) + ' reset=' + str(reset) + ' detail=' + detail)
        raise

urllib.request.urlopen = limited
sys.argv = ['probe-vision-model.py', str(jpeg), model]
runpy.run_path('/home/kvn/.hermes/profiles/clean/skills/rendered-ui-qualification/scripts/probe-vision-model.py', run_name='__main__')

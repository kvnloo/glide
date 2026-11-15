#!/usr/bin/env python3
"""Verify the published diagnostic and byte-for-byte copies of its image assets."""
import hashlib
import json
from pathlib import Path
import urllib.request

root = Path(__file__).resolve().parent
url = 'https://0.taila30dc.ts.net:8789/s/w8-baseline-recovery-blo-077f/preview/'
checks = []
for suffix in ('', 'assets/welcome-native.png', 'assets/welcome-preview.png', 'assets/omp-ref.png'):
    with urllib.request.urlopen(url + suffix, timeout=25) as response:
        data = response.read(4_000_001)
        status = response.status
        mime = response.headers.get_content_type()
    assert status == 200 and len(data) <= 4_000_000
    if suffix:
        assert data == (root / 'board' / suffix).read_bytes(), suffix
        assert mime == 'image/png'
    else:
        assert b'Seven offline readiness and isolation regression tests pass.' in data
        assert b'After: no candidate' in data
        assert b'0 of 1,000 free daily requests remaining' in data
        assert b'2026-11-15 00:00 UTC' in data
        assert b'after the native composer mounts' in data
    checks.append({'url': url + suffix, 'status': status, 'content_type': mime, 'sha256': hashlib.sha256(data).hexdigest()})
report = {'url': url, 'kind': 'diagnostic only; no accepted candidate', 'checks': checks}
(root / 'board-publication.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))

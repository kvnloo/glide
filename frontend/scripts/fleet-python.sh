#!/usr/bin/env bash
# Run producer-backed frontend tests in a disposable Python environment on the build worker.
set -euo pipefail
venv=$(mktemp -d /tmp/glide-fleet-python.XXXXXX)
trap 'rm -rf "$venv"' EXIT
python3 -m venv --system-site-packages "$venv"
source "$venv/bin/activate"
python3 -m pip install --disable-pip-version-check \
  ruamel.yaml==0.18.16 python-dotenv==1.2.4 rich==14.3.4 \
  pydantic==2.14.1 requests==2.34.2 httpx==0.28.1 openai==2.54.0 \
  prompt_toolkit==3.0.53 packaging==26.3 jinja2==3.1.6 \
  websockets==15.0.1 psutil==7.2.2 PyJWT==2.15.1
"$@"

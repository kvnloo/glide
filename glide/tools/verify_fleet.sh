#!/usr/bin/env bash
# HERMES_SRC=/path/to/hermes-git FLEET_KIT_SRC=/path/to/source-kit bash glide/tools/verify_fleet.sh
# FLEET_OUT selects the fetched logs directory. UV_BIN defaults to the installed uv 0.11.7.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

worker() {
  mkdir -p fleet-verify-artifacts
  cp .fleet-verify-manifest.json fleet-verify-artifacts/manifest.json
  cp .fleet-verify-schema.json .fleet-verify-schema.mjs fleet-verify-artifacts/
  python3 - <<'PY'
import hashlib, json, subprocess
from pathlib import Path
manifest = json.loads(Path('.fleet-verify-manifest.json').read_text())
for name, expected in manifest['inputs'].items():
    assert hashlib.sha256(Path(name).read_bytes()).hexdigest() == expected, name
for name, expected in manifest['plugin_files'].items():
    assert hashlib.sha256(Path(name).read_bytes()).hexdigest() == expected, name
with open('.fleet-verify-core.tar', 'rb') as archive:
    actual = subprocess.check_output(['git', 'get-tar-commit-id'], stdin=archive, text=True).strip()
assert actual == manifest['hermes_test_core_sha'], actual
print('Verified CI core', actual, 'and staged source hashes')
PY
  chmod +x .fleet-verify-uv
  local uv="$PWD/.fleet-verify-uv" work
  work=$(mktemp -d /tmp/glide-fleet-worker.XXXXXX)
  trap "rm -rf '$work'" EXIT
  tar -xf .fleet-verify-core.tar -C "$work"
  local core="$work/fleet-test-core"
  "$uv" --version | tee fleet-verify-artifacts/uv.log
  [[ $("$uv" --version) == 'uv 0.11.7 '* ]]
  unset UV_NATIVE_TLS UV_SYSTEM_CERTS
  export UV_PYTHON_DOWNLOADS=never HERMES_HOME="$work/home"
  export PYTHONPATH="$core:$PWD/glide/tests"
  "$uv" sync --project "$core" --frozen --python 3.14 2>&1 | tee fleet-verify-artifacts/install.log
  local status=0
  run_check() {
    local name=$1 rc=0
    shift
    "$@" 2>&1 | tee "fleet-verify-artifacts/$name.log" || rc=$?
    printf '%s=%s\n' "$name" "$rc" | tee -a fleet-verify-artifacts/status.txt
    if (( rc != 0 )); then status=1; fi
  }
  : > fleet-verify-artifacts/status.txt
  local -a python=("$uv" run --project "$core" --frozen --no-sync --with pytest --with pytest-asyncio --with 'jsonschema[format]' python)
  run_check fleet "${python[@]}" -m pytest glide/tests/test_fleet.py -q --junitxml=fleet-verify-artifacts/fleet.xml
  # Keep CI's pytest.ini profile. No additional -k, -m or --ignore filters.
  run_check python "${python[@]}" -m pytest glide/tests tests -q --junitxml=fleet-verify-artifacts/python.xml
  run_check schema "${python[@]}" glide/tests/verify_fleet_schema.py .fleet-verify-schema.json --output fleet-verify-artifacts/fleet-docs.json
  run_check browser-schema node --input-type=module - <<'JS'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FLEET_SCHEMA, validateFleet} from './.fleet-verify-schema.mjs';
assert.deepEqual(FLEET_SCHEMA, JSON.parse(readFileSync('.fleet-verify-schema.json', 'utf8')));
const cases = JSON.parse(readFileSync('fleet-verify-artifacts/fleet-docs.json', 'utf8'));
assert.equal(cases.length, 6);
for (const {case: label, doc, kitInput} of cases) {
  // Same projection as frontend/src/wire/euiKit.ts. Keep all other fields.
  const {notes, ...data} = doc.data;
  assert.ok(Array.isArray(notes) && notes.every(n => typeof n === 'string'));
  if (Array.isArray(data.hosts)) data.hosts = data.hosts.map(({notes, ...host}) => {
    assert.ok(Array.isArray(notes) && notes.every(n => typeof n === 'string'));
    return host;
  });
  assert.deepEqual(kitInput, {...doc, data});
  const result = validateFleet(kitInput.kind, kitInput.data);
  assert.equal(result.ok, true, `${label}: ${result.errors.join('; ')}`);
  console.log(`PASS kitInput ${label}; raw diagnostic strings audited separately`);
}
console.log('Browser source validator: 6 kitInput projections passed');
JS
  return "$status"
}

case "${1:-}" in
  --worker) worker; exit $? ;;
  --help) printf '%s\n' 'HERMES_SRC=/path/to/hermes-git FLEET_KIT_SRC=/path/to/source-kit [FLEET_OUT=/path/to/logs] bash glide/tools/verify_fleet.sh'; exit 0 ;;
  '') ;;
  *) echo 'verify_fleet.sh: unexpected argument' >&2; exit 2 ;;
esac
: "${HERMES_SRC:?Set HERMES_SRC to an existing Hermes Git repository containing the CI test-core commit}"
: "${FLEET_KIT_SRC:?Set FLEET_KIT_SRC to the source-kit root or its src directory}"
export UV_BIN="${UV_BIN:-$(command -v uv)}"
[[ $("$UV_BIN" --version) == 'uv 0.11.7 '* ]] || { echo 'verify_fleet.sh: uv 0.11.7 is required' >&2; exit 2; }
stage=$(mktemp -d /tmp/glide-fleet-verify.XXXXXX)
export FLEET_OUT="${FLEET_OUT:-$stage/results}"
trap 'rm -f "$stage"/core.tar "$stage"/uv "$stage"/schema.json "$stage"/schema.mjs "$stage"/manifest.json' EXIT
python3 - "$stage" <<'PY'
import hashlib, json, os, re, shutil, subprocess, sys
from pathlib import Path
stage = Path(sys.argv[1])
pins = re.findall(r'^\s*HERMES_TEST_CORE_SHA:\s*([0-9a-f]{40})\s*$', Path('.github/workflows/checks.yml').read_text(), re.M)
assert len(pins) == 1, 'Expected one CI test-core SHA'
pin = pins[0]
repo = str(Path(os.environ['HERMES_SRC']).resolve(strict=True))
subprocess.run(['git', '-C', repo, 'cat-file', '-e', pin + '^{commit}'], check=True)
entries = subprocess.check_output(['git', '-C', repo, 'ls-tree', '--name-only', pin], text=True).splitlines()
# Export the locked Python distribution, not the unrelated frontend/runtime assets.
packages = ['agent', 'gateway', 'tools', 'hermes_cli', 'hermes_platform', 'cron',
            'acp_adapter', 'plugins', 'providers', 'tui_gateway', 'locales', 'pm']
paths = packages + ['pyproject.toml', 'uv.lock', 'README.md', 'LICENSE'] + [n for n in entries if n.endswith('.py')]
subprocess.run(['git', '-C', repo, 'archive', '--format=tar', '--prefix=fleet-test-core/',
                '-o', str(stage / 'core.tar'), pin, *paths], check=True)
kit = Path(os.environ['FLEET_KIT_SRC']).resolve(strict=True)
if (kit / 'src').is_dir():
    kit /= 'src'
shutil.copyfile(kit / 'schema/fleet.v0.json', stage / 'schema.json')
shutil.copyfile(kit / 'js/fleet-schema.js', stage / 'schema.mjs')
shutil.copyfile(Path(os.environ['UV_BIN']).resolve(strict=True), stage / 'uv')
def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()
files = ['ephemeral_cards.py', 'glide/fleet.py', 'glide/gateway.py', 'glide/tests/test_fleet.py',
         'glide/tests/test_core.py', 'tests/test_plugin_registration.py', 'glide/tests/verify_fleet_schema.py',
         'glide/tools/verify_fleet.sh', 'pytest.ini', '.github/workflows/checks.yml']
manifest = {'hermes_test_core_sha': pin, 'uv_version': '0.11.7',
            'inputs': {'.fleet-verify-' + target: digest(stage / source) for source, target in
                       [('core.tar', 'core.tar'), ('uv', 'uv'), ('schema.json', 'schema.json'), ('schema.mjs', 'schema.mjs')]},
            'plugin_files': {name: digest(name) for name in files}}
(stage / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Staged CI core', pin, 'and current source schemas; no source checkouts modified')
PY
printf 'Fetched verification artifacts: %s/fleet-verify-artifacts\n' "$FLEET_OUT"
fleet-build --light --local-data --node mbp \
  --input "$stage/core.tar:.fleet-verify-core.tar" \
  --input "$stage/uv:.fleet-verify-uv" \
  --input "$stage/schema.json:.fleet-verify-schema.json" \
  --input "$stage/schema.mjs:.fleet-verify-schema.mjs" \
  --input "$stage/manifest.json:.fleet-verify-manifest.json" \
  --fetch fleet-verify-artifacts --out "$FLEET_OUT" \
  -- bash glide/tools/verify_fleet.sh --worker

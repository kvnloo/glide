"""Validate kitInput projections against the source kit's full JSON Schema.

Audit raw wrapper diagnostics separately. --output retains both raw documents and
projections. No host, repository or ops source is read.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from conftest import _load_plugin_package

_load_plugin_package()
from glide_plugin import fleet
from test_fleet import host_sources, work_config


def synthetic_documents():
    values = {
        **host_sources(), "config": work_config(),
        "github": [{"number": 1, "title": "Fleet task", "url": "https://github.com/example/glide/issues/1"}],
        "ops": {"queue": 1, "depth": 1, "sendsHour": 0, "posted": 0, "notes": []},
        "verify": [{"verdict": "pass"}],
        "brain": {"last_run": "2026-11-11T00:00:00Z", "verifier_lanes": {"mbp": "idle"},
                  "pending_review": ["example/glide#1"]},
    }
    docs = []
    with TemporaryDirectory(prefix="fleet-schema-") as directory:
        home = Path(directory)
        env = {"GLIDE_FACTORY_OPS": str(home / "ops"), "GLIDE_TASTE_WORK_CONFIG": str(home / "work.json")}
        with patch.dict(os.environ, env), patch.object(fleet.socket, "gethostname", return_value="mbp"):
            for available in (True, False):
                def source(name, _home, *args):
                    if not available:
                        raise FileNotFoundError()
                    return values[name]
                with patch.object(fleet, "_source", side_effect=source):
                    fleet._CARDS.clear()
                    fleet._REPOS.clear()
                    for view in ("hosts", "portfolio", "factory"):
                        docs.append({"case": f"{'available' if available else 'missing'}:{view}",
                                     "doc": fleet.card(home, view)})
    return docs


def kit_input(doc):
    """Mirror frontend kitInput: remove only data.notes and host.notes."""
    projected = deepcopy(doc)
    projected["data"].pop("notes", None)
    for host in projected["data"].get("hosts", []):
        host.pop("notes", None)
    return projected


def diagnostic_strings(doc):
    groups = [doc["data"].get("notes", [])]
    groups.extend(host.get("notes", []) for host in doc["data"].get("hosts", []))
    for notes in groups:
        if not isinstance(notes, list) or not all(isinstance(note, str) for note in notes):
            raise ValueError("Wrapper diagnostics must be a string array")
    return [note for notes in groups for note in notes]


def main():
    from jsonschema import Draft202012Validator, FormatChecker

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("schema", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    schema = json.loads(args.schema.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    checker = FormatChecker()
    if checker.conforms("not-a-timestamp", "date-time"):
        parser.error("Install jsonschema[format] to enable date-time validation")
    validator = Draft202012Validator(schema, format_checker=checker)
    docs = synthetic_documents()
    for case in docs:
        diagnostic_strings(case["doc"])
        case["kitInput"] = kit_input(case["doc"])
    if args.output:
        args.output.write_text(json.dumps(docs, indent=2) + "\n", encoding="utf-8")
    failures = 0
    for case in docs:
        errors = list(validator.iter_errors(case["kitInput"]))
        if not errors:
            print(f"PASS kitInput {case['case']}; raw diagnostic strings audited separately")
            continue
        failures += 1
        branch = next(i for i, item in enumerate(schema["oneOf"])
                      if item["properties"]["kind"]["const"] == case["doc"]["kind"])
        for error in errors:
            relevant = [e for e in error.context if e.schema_path[0] == branch] or [error]
            for detail in relevant[:12]:
                path = ".".join(map(str, detail.absolute_path)) or "$"
                print(f"FAIL {case['case']} {path}: {detail.message}")
    print(f"source schema: {len(docs) - failures} kitInput projections passed, {failures} failed")
    return int(bool(failures))


if __name__ == "__main__":
    raise SystemExit(main())

"""Owned headless proof adapter. Synthetic pending only; never decide or render.

The synthetic model mirrors hermes-plugin/tests/test_intents.py::canonical.
The service, compiler, hash checks, validator and plugin command are real.
"""
import importlib.util
import json
import os
from pathlib import Path
import sys


plugin_root, proof_root, mode, session_id = sys.argv[1:]
root = Path(proof_root).resolve()
assert root.name.startswith("W1-proof"), "Expected an owned W1-proof directory"
assert mode in {"synthetic", "unavailable"}
os.environ["FACTORY_DATA_DIR"] = str(root / "backend" / mode)
os.environ["FACTORY_RUNS"] = str(root / "runs")
os.environ["FACTORY_SCENES"] = str(root / "scenes.jsonl")

spec = importlib.util.spec_from_file_location("factory_plugin", Path(plugin_root) / "__init__.py",
                                             submodule_search_locations=[plugin_root])
plugin = importlib.util.module_from_spec(spec)
sys.modules["factory_plugin"] = plugin
spec.loader.exec_module(plugin)
core = plugin.core
from factory_plugin import intents


def forbidden_launcher(*args, **kwargs):
    raise AssertionError("This proof must never launch a GPU renderer")


core.Popen = forbidden_launcher
core.LAUNCHER = root / "forbidden-launcher"

if mode == "synthetic":
    from z0int.intent_service import IntentService

    class SyntheticEvidence:
        async def retrieve(self, *args):
            return {"records": [], "sources": [{"source": "synthetic-test", "status": "unavailable"}], "latency_ms": 0}

    async def synthetic_model(request):
        context = request["context"]
        scope = json.loads(context["text"].split("\n", 1)[1])
        decisions, tasks = [], []
        for entry, source in context["document"]["plan"]["bindings"]["sources"].items():
            for sentence in source["sentences"]:
                ref = {"entryId": entry, "sentenceId": sentence["id"]}
                decisions.append({**ref, "classification": "not-an-ask" if tasks else "add", "reason": "synthetic fixture"})
                if not tasks:
                    target = intents.target(scope)
                    tasks.append({**ref, "target": target, "interpretation": "SYNTHETIC TEST ONLY",
                                  "executor": "factory", "assumptions": [], "conflicts": [],
                                  "verifier": {"type": "human_review", "target": target}})
        return {"model_id": "factory/synthetic-test-only", "draft": {
            "classification": "new_ask", "sentences": decisions, "tasks": tasks,
            "assumptions": [], "amendments": [], "conflicts": [], "delegation_plan": []}}

    service = IntentService(root=root / "backend" / mode / "aodl", retriever=SyntheticEvidence(), model=synthetic_model)
    intents.create_service = lambda data_dir: service

# Only this read/proposal command is exposed to the frontend proof.
output = core.command("json suggest {}", session_id)
answer = json.loads(output)
if mode == "synthetic":
    assert answer["suggestions"] and not answer.get("error"), answer
    assert all(row["status"] == "pending" for row in answer["suggestions"])
else:
    assert answer.get("fail_closed") is True and answer["suggestions"] == [], answer
    assert "machine" in answer["error"].lower(), answer

# Reject any unexpected approval root or execution claim in either isolated store.
assert not list((root / "backend").glob("*/claims/*.json"))
for path in (root / "backend").glob("*/aodl/intent/*/contract-*.json"):
    raise AssertionError(f"Unexpected non-pending contract: {path}")
for path in (root / "backend").glob("*/aodl/intent/*/.pending/contract-*.json"):
    doc = json.loads(path.read_text())
    approval = doc["plan"]["bindings"]["approval"]
    assert approval["status"] == "pending" and not approval.get("approved_by"), approval
print(output)

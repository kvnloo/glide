"""GL-103: a council started in Glide continues from another client through the gateway methods."""

from __future__ import annotations

import importlib.util
import json
import sys
import types
from dataclasses import dataclass
from pathlib import Path

import pytest

from glide_plugin import core
from glide_plugin import council_session as cs

FIXTURE = Path(__file__).parent / "fixtures" / "council-session-v1.json"


class Failure(Exception):
    def __init__(self, code: int, message: str):
        super().__init__(message)
        self.code = code


@pytest.fixture(autouse=True)
def _gateway_failure(monkeypatch):
    """The core's secret-safe failure type, stubbed where no hermes-agent checkout is importable."""
    if importlib.util.find_spec("hermes_cli") is None:
        module = types.ModuleType("hermes_cli.plugin_gateway_methods")
        module.GatewayMethodFailure = Failure
        monkeypatch.setitem(sys.modules, "hermes_cli", types.ModuleType("hermes_cli"))
        monkeypatch.setitem(sys.modules, "hermes_cli.plugin_gateway_methods", module)


@pytest.fixture
def home(tmp_path, monkeypatch):
    profile = tmp_path / "profile"
    monkeypatch.setattr(core, "_home", lambda: profile)
    return profile


@dataclass(frozen=True)
class Request:
    """The attachment snapshot a transport hands a plugin method."""
    session_id: str
    attached: bool = True

    def assert_attached(self) -> None:
        if not self.attached:
            raise PermissionError("gateway session detached or replaced")


class Client:
    """One gateway client: its own registration of the plugin, attached to its own live session."""

    def __init__(self, live: str, name: str):
        self.live, self.name, self.methods = live, name, {}
        cs.register(types.SimpleNamespace(register_gateway_method=self._register))

    def _register(self, name, handler, *, schema):
        assert schema.model_config.get("extra") == "forbid"
        self.methods[name] = (handler, schema)

    def __call__(self, method: str, **params):
        handler, schema = self.methods[method]
        params = {"session_id": self.live, **params}
        schema.model_validate(params)
        return json.loads(json.dumps(handler(Request(self.live), params)))


def fixture() -> dict:
    return json.loads(FIXTURE.read_text())


def started(glide: Client, **position) -> dict:
    wire = fixture()
    return glide("glide.council.start", stored_session_id=wire["stored_session_id"], client="glide",
                 live=wire["live"], run=wire["run"], passages=wire["passages"],
                 position={**wire["position"], **position}, **{"from": wire["from"]})


def test_registers_three_segment_methods_only_on_cores_with_gateway_methods():
    assert sorted(Client("a", "glide").methods) == [
        "glide.council.list", "glide.council.load", "glide.council.position", "glide.council.start"]
    cs.register(types.SimpleNamespace())  # stock Hermes: nothing to register, no error


def test_council_started_in_glide_resumes_on_a_fresh_client(home):
    glide = Client("glide-live-1", "glide")
    state = started(glide, elapsed_ms=0, passage=None, sentence=0, read_aloud=True)
    council_id = state["council_id"]
    assert state["revision"] == 1 and state["schema"] == cs.SCHEMA
    # Glide plays on and reads the report aloud; its position follows the reading.
    moved = glide("glide.council.position", council_id=council_id, client="glide", base_revision=1,
                  position={"elapsed_ms": 18000, "passage": "report:dissent", "sentence": 1,
                            "read_aloud": True, "muted": False})
    assert moved["revision"] == 2

    # The serialized state is all another device needs: one JSON record in the profile.
    record = json.loads((home / "glide" / "councils" / f"{council_id}.json").read_text())
    assert record == moved

    # A fresh client (the phone) resumes the same Hermes conversation under its own live session.
    phone = Client("phone-live-7", "hermes-android")
    listed = phone("glide.council.list", stored_session_id=fixture()["stored_session_id"])["councils"]
    assert [row["council_id"] for row in listed] == [council_id]
    assert listed[0]["brief"] == fixture()["run"]["brief"] and listed[0]["updated_by"] == "glide"
    assert phone("glide.council.list", stored_session_id="another-conversation")["councils"] == []
    resumed = phone("glide.council.load", council_id=council_id)
    assert resumed == moved
    assert resumed["position"] == {"elapsed_ms": 18000, "passage": "report:dissent", "sentence": 1,
                                   "read_aloud": True, "muted": False}
    keys = [p["key"] for p in resumed["passages"]]
    assert keys[keys.index(resumed["position"]["passage"]):] == ["report:dissent", "report:abstentions", "report:receipts"]

    # The phone keeps listening and takes the council over; Glide's stale write is refused.
    took = phone("glide.council.position", council_id=council_id, client="hermes-android", base_revision=2,
                 position={**resumed["position"], "passage": "report:receipts", "sentence": 0})
    assert (took["revision"], took["updated_by"]) == (3, "hermes-android")
    with pytest.raises(Exception) as stale:
        glide("glide.council.position", council_id=council_id, client="glide", base_revision=2,
              position={**resumed["position"], "sentence": 2})
    assert stale.value.code == cs.CONFLICT and "revision 3" in str(stale.value)
    assert glide("glide.council.load", council_id=council_id)["position"]["passage"] == "report:receipts"


def test_methods_are_bound_to_the_attached_session(home):
    glide = Client("glide-live-1", "glide")
    handler, _ = glide.methods["glide.council.list"]
    with pytest.raises(PermissionError):
        handler(Request("glide-live-1", attached=False), {"session_id": "glide-live-1"})
    with pytest.raises(PermissionError):
        handler(Request("glide-live-1"), {"session_id": "someone-else"})


def test_refuses_runs_passages_and_positions_it_cannot_resume(home):
    glide = Client("g", "glide")
    wire = fixture()
    base = {"stored_session_id": "root", "client": "glide", "live": True, "from": "council.test",
            "run": wire["run"], "passages": wire["passages"]}
    bad = [
        ({**base, "run": {**wire["run"], "schema": "other/v1"}}, "schema"),
        ({**base, "passages": wire["passages"][1:]}, "first passage"),
        ({**base, "passages": [wire["passages"][0], wire["passages"][0]]}, "share a key"),
        ({**base, "passages": [*wire["passages"], {"key": "seat:nobody", "label": "X", "text": "Y.", "seat": "nobody"}]}, "unknown seat"),
        ({**base, "position": {"passage": "report:missing"}}, "unknown passage"),
        ({**base, "run": {**wire["run"], "pad": "x" * cs.MAX_RUN_BYTES}}, "larger than"),
    ]
    for params, why in bad:
        with pytest.raises(Exception) as refused:
            glide("glide.council.start", **params)
        assert refused.value.code == cs.INVALID and why in str(refused.value)
    with pytest.raises(Exception) as missing:
        glide("glide.council.load", council_id="council-" + "0" * 32)
    assert missing.value.code == cs.NOT_FOUND
    with pytest.raises(ValueError):  # schema: strict ids
        glide("glide.council.load", council_id="../../etc/passwd")


def test_stock_hermes_reaches_the_same_verbs_through_glide_json(home):
    started_raw = core._json_call(home, "council.start " + json.dumps({
        "stored_session_id": "root-1", "client": "hermes-android", "live": False, "from": "demo",
        "run": fixture()["run"], "passages": fixture()["passages"]}), "live-9")
    state = json.loads(started_raw)
    assert state["started_by"] == "hermes-android"
    loaded = json.loads(core._json_call(home, "council.load " + json.dumps({"council_id": state["council_id"]}), "other-live"))
    assert loaded == state
    stale = json.loads(core._json_call(home, "council.position " + json.dumps({
        "council_id": state["council_id"], "client": "glide", "base_revision": 7, "position": {}}), "live-9"))
    assert stale == {"error": "the council moved on: revision 1 is current", "code": cs.CONFLICT}
    assert "error" in json.loads(core._json_call(home, "council.load {}", "live-9"))


def test_wire_fixture_matches_what_start_writes(home):
    wire = fixture()
    state = started(Client("g", "glide"))
    assert set(state) == set(wire)
    assert state["passages"] == wire["passages"] and state["run"] == wire["run"]
    assert (state["live"], state["from"], state["position"]) == (wire["live"], wire["from"], wire["position"])
    assert [p["key"] for p in wire["passages"]][0] == "brief"


def test_keeps_only_the_newest_councils(home, monkeypatch):
    monkeypatch.setattr(cs, "MAX_COUNCILS", 3)
    glide = Client("g", "glide")
    ids = [started(glide)["council_id"] for _ in range(5)]
    left = {p.stem for p in (home / "glide" / "councils").glob("council-*.json")}
    assert len(left) == 3 and ids[-1] in left

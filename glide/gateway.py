"""Gateway methods (`glide.detect|sync|enable|recall|taste|focus|route`) for frontends that draw their own cards.

Optional: Hermes cores without ``register_gateway_method`` skip them, and `/glide` still works.

Every method is bound to the session the caller is attached to.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from . import attention, core, source, taste
from .skill_router import install as skill_router_install
from .offload import savings_card as offload_savings_card

NAMESPACE = "glide"


class SessionParams(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: str = Field(min_length=1)


class SyncParams(SessionParams):
    limit: int = Field(default=source.MAX_SESSIONS, ge=1, le=source.MAX_SESSIONS, strict=True)


class EnableParams(SessionParams):
    on: bool = Field(strict=True)


class RecallParams(SessionParams):
    query: str = Field(min_length=1, max_length=512)


class SkillRouterParams(SessionParams):
    """Params for skill_router gateway method - no extra fields beyond session_id."""
    model_config = ConfigDict(extra="forbid")


class HillClimbParams(SessionParams):
    """`run=True` scaffolds the CPU benchmark if needed and runs one paired round."""
    model_config = ConfigDict(extra="forbid")
    run: bool = False


class FocusParams(SessionParams):
    """`action`: show the card, start/stop a deep-work block, or save the wind-down resume note."""
    action: str = Field(default="show", pattern="^(show|start|stop|wind_down)$")
    minutes: int = Field(default=50, ge=5, le=240, strict=True)


class RouteParams(SessionParams):
    """One agent notification or approval ask: delivered now, or held for the end of the block."""
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(default="", max_length=1000)
    cls: str = Field(default="report", pattern="^(critical|decision|report|digest)$")


class OffloadParams(SessionParams):
    """`run=True` sends one sample summarizing task to the smallest local model first."""
    model_config = ConfigDict(extra="forbid")
    run: bool = False


_SAMPLE_TASK = (
    "Summarize in two sentences: Glide reads your past local Hermes sessions, keeps the corrections "
    "you gave, and quotes up to three matching ones into each new turn. Recall is BM25 over the kept "
    "corrections, with no embeddings and no model calls, and nothing leaves the machine."
)


VERBS = {
    "detect": (SessionParams, lambda home, p: core.detect(home)),
    "taste": (SessionParams, lambda home, p: taste.board()),
    "sync": (SyncParams, lambda home, p: core.sync(home, p.limit, p.session_id)),
    "enable": (EnableParams, lambda home, p: core.set_enabled(home, p.on)),
    "recall": (RecallParams, lambda home, p: {"hits": core.recall(home, p.query)}),
    "skill_router": (SkillRouterParams, lambda home, p: _skill_router_run(home, p)),
    "hill_climb": (HillClimbParams, lambda home, p: _hill_climb_run(home, p)),
    "offload": (OffloadParams, lambda home, p: _offload_run(home, p)),
    "focus": (FocusParams, lambda home, p: _focus_run(home, p)),
    "route": (RouteParams, lambda home, p: attention.route(home, p.title, p.body, p.cls)),
}


def _focus_run(home: Path, params: FocusParams) -> dict:
    if params.action == "start":
        attention.start_block(home, params.minutes)
    if params.action == "stop":
        released = attention.stop_block(home)
        return {**attention.focus(home), **released}
    if params.action == "wind_down":
        nudge = attention.wind_down(home, session_id=params.session_id, force=True)
        return {**attention.focus(home), "wind_down": nudge}
    return attention.focus(home)


def _skill_router_run(home: Path, params: SkillRouterParams) -> dict:
    """Install the router catalog (idempotent) and return it for the card."""
    from .skill_router import load_state

    result = skill_router_install(home)
    state = load_state(home)
    top = [
        {"category": name, "rule": rule.rule,
         "skills": [s for s in rule.preferred_order if s in state.skills]}
        for name, rule in state.categories.items()
    ]
    return {
        "installed": bool(state.categories and state.skills),
        "fresh": bool(result.get("installed")),
        "categories": len(state.categories),
        "skills": len(state.skills),
        "top": top,
    }


def _hill_climb_run(home: Path, params: HillClimbParams) -> dict:
    """Run hill climb and return structured JSON for the card."""
    from .hill_climb import run_round, scaffold, status as hc_status

    if params.run:
        if not hc_status(home).get("scaffolded"):
            scaffold(home)
        run_round(home)
    state = hc_status(home)

    if not state.get("scaffolded"):
        return {
            "target": "CPU benchmark",
            "metric": "score",
            "baseline": None,
            "candidate": None,
            "delta": None,
            "noise": None,
            "verdict": None,
            "reason": "Not scaffolded. Run '/glide hill-climb scaffold' first.",
        }

    last_verdict = state.get("last_verdict")
    if last_verdict is None:
        spec = state.get("kernel_spec", {})
        return {
            "target": "CPU benchmark",
            "metric": spec.get("metric", "score"),
            "baseline": None,
            "candidate": None,
            "delta": None,
            "noise": None,
            "verdict": None,
            "reason": "No rounds completed yet.",
        }

    verdict = last_verdict["decision"]
    reason = last_verdict["reason"]
    stats = last_verdict.get("stats", {})

    baseline_mean = stats.get("baseline_mean")
    candidate_mean = stats.get("candidate_mean")
    mean_diff = stats.get("mean_diff")
    noise_floor = stats.get("noise_floor")

    return {
        "target": "CPU benchmark",
        "metric": "score",
        "baseline": (
            {"mean": baseline_mean, "scores": []} if baseline_mean is not None else None
        ),
        "candidate": (
            {"mean": candidate_mean, "scores": []} if candidate_mean is not None else None
        ),
        "delta": mean_diff,
        "noise": noise_floor,
        "verdict": verdict,
        "reason": reason,
    }


def _offload_run(home: Path, params: OffloadParams) -> dict:
    """Recorded offload savings plus the local models found right now."""
    from .offload import detect_local_models, offload_task

    if params.run:
        offload_task(home, "summarize", _SAMPLE_TASK)
    models = [m.get("name") or m.get("model") or str(m) for m in detect_local_models()]
    card = offload_savings_card(home)
    if card.get("empty"):
        return {"local_models": models, "tasks": 0, "tokens_offloaded": 0,
                "est_cost_saved_usd": 0.0, "assumptions": ["No offload tasks recorded yet."]}
    return {
        "local_models": card.get("models_used") or models,
        "tasks": card.get("total_tasks", 0),
        "tokens_offloaded": card.get("total_tokens_saved", 0),
        "est_cost_saved_usd": card.get("estimated_cost_saved_usd", 0.0),
        "assumptions": ["Estimate: frontier tokens priced at $0.01 per 1k (blended)"],
    }


def call(home: Path, verb: str, params: dict):
    """One `glide.<verb>` call with its schema checked; shared by both transports."""
    schema, run = VERBS[verb]
    return run(home, schema.model_validate(params))


def register(ctx) -> None:
    registrar = getattr(ctx, "register_gateway_method", None)
    if not callable(registrar):
        return

    def bind(verb: str):
        def handler(request, params: dict):
            request.assert_attached()
            if params["session_id"] != request.session_id:
                raise PermissionError("not the attached session")
            return call(core._home(), verb, params)
        return handler

    for verb, (schema, _run) in VERBS.items():
        registrar(f"{NAMESPACE}.{verb}", bind(verb), schema=schema)
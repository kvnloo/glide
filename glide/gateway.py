"""Gateway methods (`glide.detect|sync|enable|recall`) for frontends that draw their own cards.

Optional: Hermes cores without ``register_gateway_method`` skip them, and `/glide` still works.

Every method is bound to the session the caller is attached to.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from . import core, source
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
    """Params for hill_climb gateway method - no extra fields beyond session_id."""
    model_config = ConfigDict(extra="forbid")


class OffloadParams(SessionParams):
    """Params for offload gateway method - no extra fields beyond session_id."""
    model_config = ConfigDict(extra="forbid")


VERBS = {
    "detect": (SessionParams, lambda home, p: core.detect(home)),
    "sync": (SyncParams, lambda home, p: core.sync(home, p.limit, p.session_id)),
    "enable": (EnableParams, lambda home, p: core.set_enabled(home, p.on)),
    "recall": (RecallParams, lambda home, p: {"hits": core.recall(home, p.query)}),
    "skill_router": (SkillRouterParams, lambda home, p: _skill_router_run(home, p)),
    "hill_climb": (HillClimbParams, lambda home, p: _hill_climb_run(home, p)),
    "offload": (OffloadParams, lambda home, p: _offload_run(home, p)),
}


def _skill_router_run(home: Path, params: SkillRouterParams) -> dict:
    """Run skill router and return structured JSON for the card."""
    result = skill_router_install(home)
    if result.get("installed"):
        from .skill_router import load_state

        state = load_state(home)
        top = []
        for cat_name, cat_rule in state.categories.items():
            skills_in_cat = []
            for skill_name in cat_rule.preferred_order:
                skill = state.skills.get(skill_name)
                if skill:
                    skills_in_cat.append(
                        {"name": skill.name, "description": skill.description}
                    )
            top.append({"category": cat_name, "rule": cat_rule.rule, "skills": skills_in_cat})

        return {
            "installed": True,
            "categories": result["categories"],
            "skills": result["skills"],
            "top": top,
        }
    else:
        return {
            "installed": False,
            "categories": result["categories"],
            "skills": result["skills"],
            "top": [],
        }


def _hill_climb_run(home: Path, params: HillClimbParams) -> dict:
    """Run hill climb and return structured JSON for the card."""
    from .hill_climb import status as hc_status

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
    """Run offload and return structured JSON for the card."""
    result = offload_savings_card(home)

    if result.get("empty"):
        return {
            "local_model": None,
            "tasks": 0,
            "tokens_offloaded": 0,
            "est_cost_saved_usd": 0.0,
            "assumptions": ["No offload tasks recorded yet."],
        }

    # Map from savings_card format to gateway format
    # savings_card returns: {empty, session_duration_s, total_tasks, total_prompt_tokens,
    #   total_completion_tokens, total_tokens_saved, estimated_cost_saved_usd,
    #   total_offload_time_ms, by_type, models_used}
    # gateway format: {local_model, tasks, tokens_offloaded, est_cost_saved_usd, assumptions}
    return {
        "local_model": result.get("models_used", [None])[0],
        "tasks": result.get("total_tasks", 0),
        "tokens_offloaded": result.get("total_tokens_saved", 0),
        "est_cost_saved_usd": result.get("estimated_cost_saved_usd", 0.0),
        "assumptions": ["Frontier cost @ ${0.01}/1k tokens (rough blend)"],
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
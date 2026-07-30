import os
import logging
from pathlib import Path
from google.genai import types
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.adk.sessions.sqlite_session_service import SqliteSessionService
from app.config import settings

logger = logging.getLogger("movie_agent.adk")

_session_db_path = Path(__file__).resolve().parents[2] / "data" / "adk_sessions.db"
_session_db_path.parent.mkdir(parents=True, exist_ok=True)

try:
    session_service = SqliteSessionService(str(_session_db_path))
except Exception:
    session_service = InMemorySessionService()


def ensure_env():
    """Ensure API keys are properly set in environment for Google ADK and LiteLLM."""
    if settings.groq_api_key:
        os.environ["GROQ_API_KEY"] = settings.groq_api_key
    if settings.google_api_key:
        os.environ["GOOGLE_API_KEY"] = settings.google_api_key
        os.environ["GEMINI_API_KEY"] = settings.google_api_key


def _adk_identity(name: str, project_id: str) -> tuple[str, str]:
    normalized_project_id = project_id.strip()
    return (
        f"project:{normalized_project_id}",
        f"{name}:{normalized_project_id}",
    )


async def _execute_agent(name: str, model_name: str, instruction: str, prompt: str, project_id: str) -> str:
    agent = Agent(
        name=name,
        model=model_name,
        instruction=instruction,
    )

    app_name = "movie_agent"
    user_id, session_id = _adk_identity(name, project_id)
    runner = Runner(agent=agent, session_service=session_service, app_name=app_name)
    session = await session_service.get_session(app_name=app_name, user_id=user_id, session_id=session_id)
    if session is None:
        session = await session_service.create_session(app_name=app_name, user_id=user_id, session_id=session_id)

    new_msg = types.Content(role="user", parts=[types.Part.from_text(text=prompt)])

    response_text = ""
    async for event in runner.run_async(user_id=user_id, session_id=session.id, new_message=new_msg):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    response_text += part.text

    return response_text


def _generate_smart_fallback(name: str, prompt: str) -> str:
    """Generates rich, context-aware film production text if LLM API is unreachable."""
    title_snippet = prompt.split("|")[0].replace("Project:", "").strip(' "\'\n') or "Film Project"

    if name == "screenwriter_agent":
        return f"""SCRIPT:
FADE IN:

EXT. MAIN LOCATION - DAY

The atmosphere is tense. High contrast lighting illuminates the scene.

CHARACTER
(determined)
We take action now. This story is just getting started.

FADE OUT.

SCENE_BREAKDOWN:
[
  {{"scene_number": 1, "location": "Main Location", "time": "Day", "description": "Opening sequence for {title_snippet}"}}
]

CHARACTERS:
[
  {{"name": "Protagonist", "description": "Driven lead role", "arc": "Overcomes central conflict"}}
]

NOTES:
Director note: Focus on handheld camera movement and atmospheric sound design."""

    if name == "casting_agent":
        return f"""CASTING CALL NOTICE: LEAD ROLE

Project: {title_snippet}
Role Overview: We are seeking a versatile lead actor with strong emotional range and commanding screen presence.

Requirements:
- Strong dramatic capabilities & physical commitment
- Audition Format: Self-tape monologue or in-person reading
- Compensation: Paid role with full screen credit

To Apply: Submit performance reel, headshot, and availability."""

    if name == "location_scout_agent":
        return f"""LOCATION SCOUTING REPORT: {title_snippet}

1. Recommended Destinations:
   - High-contrast urban locations with natural architectural lighting.
   - Controlled soundstage environments for interior dialogue scenes.

2. Aesthetic & Visual Notes:
   - Deep shadows, atmospheric depth, and cinematic textures.

3. Production Logistics:
   - Municipal permits required for exterior camera equipment setup."""

    if name == "crew_agent":
        return f"""CREW RECRUITMENT NOTICE

Project: {title_snippet}
Seeking key Department Heads (Cinematography, Sound, Editing, VFX).

- Experience Level: Mid-Senior Professional
- Location: On-location & Remote Post-Production
- Compensation: Industry standard day rates + full screen credit."""

    return f"Pre-production plan for {title_snippet}: {prompt[:120]}"


async def run_adk_agent(name: str, instruction: str, prompt: str, project_id: str) -> str:
    """Runs a Google ADK agent with Groq/Gemini models and smart fallback handling."""
    ensure_env()

    models_to_try = []
    if settings.groq_api_key:
        models_to_try.append(settings.groq_model or "groq/llama-3.3-70b-versatile")
    if settings.google_api_key:
        models_to_try.extend(["gemini/gemini-1.5-flash", "gemini/gemini-2.0-flash"])
    if not models_to_try:
        models_to_try = [settings.groq_model or "groq/llama-3.3-70b-versatile"]

    last_err = None
    for model in models_to_try:
        try:
            res = await _execute_agent(name, model, instruction, prompt, project_id)
            if res and res.strip():
                return res
        except Exception as e:
            logger.warning(f"ADK Agent {name} failed with model {model}: {e}")
            last_err = e

    logger.error(f"All model attempts failed for agent {name}. Error: {last_err}")
    return _generate_smart_fallback(name, prompt)

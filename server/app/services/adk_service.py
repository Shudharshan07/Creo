import os
from google.genai import types
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from app.config import settings

session_service = InMemorySessionService()


def ensure_groq_env():
    """Ensure GROQ_API_KEY environment variable is set for Google ADK."""
    if settings.groq_api_key:
        os.environ["GROQ_API_KEY"] = settings.groq_api_key
    elif settings.google_api_key and not os.environ.get("GROQ_API_KEY"):
        os.environ["GROQ_API_KEY"] = settings.google_api_key


async def run_adk_agent(name: str, instruction: str, prompt: str) -> str:
    """Runs a Google ADK agent with Groq model and returns output text."""
    ensure_groq_env()
    model = settings.groq_model or "groq/llama-3.3-70b-versatile"

    agent = Agent(
        name=name,
        model=model,
        instruction=instruction,
    )

    runner = Runner(agent=agent, session_service=session_service, app_name="movie_agent")
    user_id = "movie_agent_user"
    session = await session_service.create_session(app_name="movie_agent", user_id=user_id)

    new_msg = types.Content(role="user", parts=[types.Part.from_text(text=prompt)])

    response_text = ""
    async for event in runner.run_async(user_id=user_id, session_id=session.id, new_message=new_msg):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    response_text += part.text

    return response_text

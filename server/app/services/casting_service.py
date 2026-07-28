from app.services.adk_service import run_adk_agent


async def generate_casting_poster(casting_call, project) -> str:
    instruction = "You are a casting director assistant."
    prompt = f"""
Project: "{project.title}" | Genre: {project.genre or 'unspecified'}
Character: {casting_call.character_name}
Role Description: {casting_call.role_description or 'not provided'}
Requirements: {casting_call.requirements or 'open'}
Audition Format: {casting_call.audition_format or 'self-tape'}
Paid: {'Yes' if casting_call.is_paid else 'No - passion project'}
Compensation: {casting_call.compensation_notes or 'to be discussed'}

Write a concise, compelling casting notice (150-250 words) that directors would post on casting platforms.
Include role overview, what you're looking for, and how to apply.
"""
    return await run_adk_agent(name="casting_agent", instruction=instruction, prompt=prompt)

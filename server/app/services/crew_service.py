from app.services.adk_service import run_adk_agent


async def generate_crew_posting(posting, project) -> str:
    instruction = "You are a film production coordinator."
    prompt = f"""
Project: "{project.title}" | Genre: {project.genre or 'unspecified'}
Role: {posting.role_title}
Department: {posting.department or 'unspecified'}
Experience Level: {posting.experience_level or 'mid-level'}
Requirements: {posting.requirements or 'not specified'}
Location: {posting.location or 'TBD'} | Remote: {'Yes' if posting.is_remote else 'No'}
Paid: {'Yes' if posting.is_paid else 'No - passion project'}
Compensation: {posting.compensation_notes or 'to be discussed'}

Write a concise, professional crew job posting (150-250 words) suitable for film industry job boards.
Include role responsibilities, what skills are needed, and how to apply.
"""
    return await run_adk_agent(
        name="crew_agent",
        instruction=instruction,
        prompt=prompt,
        project_id=str(project.id),
    )

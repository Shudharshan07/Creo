from app.services.adk_service import run_adk_agent


async def generate_location_report(location_scout, project) -> str:
    instruction = "You are a senior film location scout and location manager assistant."
    prompt = f"""
Project: "{project.title}" | Genre: {project.genre or 'unspecified'} | Logline: {project.logline or 'unspecified'}
Target Scene / Requirements: {location_scout.location_name}
Location Type: {location_scout.location_type or 'General / Architectural'}
Visual Description Cue: {location_scout.visual_description or 'not provided'}

Provide a detailed, professional Location Scouting Report (200-350 words).
Structure the report with clear sections:
1. Recommended Filming Destinations & Real-World Spots (specific cities/landscapes/architectural styles)
2. Atmospheric & Visual Aesthetics
3. Production Considerations (Lighting conditions, Sound environment, Permits & Accessibility)
4. Alternative Budget / Soundstage Recommendations
"""
    return await run_adk_agent(
        name="location_scout_agent",
        instruction=instruction,
        prompt=prompt,
        project_id=str(project.id),
    )

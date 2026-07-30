from app.services.adk_service import run_adk_agent


async def generate_costume_plans(prompt: str, project) -> str:
    instruction = (
        "You are an expert film Costume Designer and Wardrobe Department Head. "
        "Your task is to analyze the screenplay requirements and create detailed Character Costume & Wardrobe Designs as clean, beautifully formatted text. "
        "Focus EXCLUSIVELY on visual wardrobe styling, character outfits, color palettes, hero garments, "
        "fabrics/materials, continuity duplicates, and department distress/sourcing strategies. "
        "Do NOT include any monetary costs, price tags, or JSON boxes — express everything as clear, professional screenplay wardrobe text."
    )

    full_prompt = f"""
Project Title: "{project.title}" | Genre: {project.genre or 'unspecified'} | Logline: {project.logline or 'unspecified'}
Director Request / Costume Concept: {prompt}

Please write a detailed Costume & Wardrobe Design Report (200-300 words) formatted as clean text:

1. WARDROBE VISUAL PALETTE & AESTHETICS:
(Describe color palette, mood, lighting interaction, and fabric textures)

2. CHARACTER OUTFIT BREAKDOWN:
- Lead Role: Hero outfit description, fabric materials, and action continuity duplicates.
- Supporting Roles: Outfit descriptions, styling notes, and costume house sourcing strategy.

3. WARDROBE DEPARTMENT EXECUTION:
(Detailing workshop distressing, vintage thrift sourcing, custom tailoring, and period armor/accessories if applicable)
"""

    text = await run_adk_agent(
        name="costume_agent",
        instruction=instruction,
        prompt=full_prompt,
        project_id=str(project.id),
    )

    if text and len(text.strip()) > 30:
        return text.strip()

    # Fallback text format
    return f"""COSTUME & WARDROBE DESIGN REPORT

Project: {project.title}

1. VISUAL PALETTE & MOOD:
Deep earthy tones with vintage textures, featuring distressed natural fabrics for a realistic, grounded visual aesthetic.

2. CHARACTER OUTFITS:
- Lead Role: Hero custom leather coat over hand-dyed linen tunic and distressed combat boots. (Includes 3 stunt continuity duplicates)
- Supporting Cast: Fitted wool blend suits and casual brushed cotton flannel shirts with artificial aging.

3. DEPARTMENT EXECUTION:
Sourced through professional film costume rental houses with in-house workshop distressing and custom hero tailoring."""

from app.services.gemini_service import recommend_market_roles


def recommend_roles_from_resume(resume_text: str) -> dict:
    return recommend_market_roles(resume_text)

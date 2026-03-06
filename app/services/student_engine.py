from app.services.gemini_service import (
    analyze_student_resume,
    evaluate_skill_profile,
    generate_student_action_tracker,
)
from app.services.recommendation_engine import recommend_roles_from_resume


def run_resume_review(resume_text: str, desired_role: str | None = None) -> dict:
    return analyze_student_resume(resume_text, desired_role)


def run_skill_evaluation(
    known_skills: list[str], interests: list[str], preferred_domains: list[str]
) -> dict:
    return evaluate_skill_profile(known_skills, interests, preferred_domains)


def run_role_recommendations(resume_text: str) -> dict:
    return recommend_roles_from_resume(resume_text)


def run_action_tracker(
    desired_role: str | None,
    resume_strengths: str,
    resume_weaknesses: str,
    missing_technical_skills: list[str],
    missing_soft_skills: list[str],
    roadmap: str,
) -> dict:
    return generate_student_action_tracker(
        desired_role=desired_role,
        resume_strengths=resume_strengths,
        resume_weaknesses=resume_weaknesses,
        missing_technical_skills=missing_technical_skills,
        missing_soft_skills=missing_soft_skills,
        roadmap=roadmap,
    )

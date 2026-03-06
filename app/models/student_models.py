from pydantic import BaseModel, Field


class ResumeReviewResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    resume_strengths: str
    resume_weaknesses: str
    improvement_suggestions: str
    missing_technical_skills: list[str]
    missing_soft_skills: list[str]


class SkillEvaluationRequest(BaseModel):
    known_skills: list[str]
    interests: list[str]
    preferred_domains: list[str]


class SkillEvaluationResponse(BaseModel):
    best_roles: list[str]
    internship_domains: list[str]
    skills_to_learn: list[str]
    roadmap: str


class ActionTrackerRequest(BaseModel):
    desired_role: str | None = None
    resume_strengths: str = ""
    resume_weaknesses: str = ""
    missing_technical_skills: list[str] = []
    missing_soft_skills: list[str] = []
    roadmap: str = ""


class ActionItem(BaseModel):
    task: str
    category: str
    priority: str


class ActionTrackerResponse(BaseModel):
    action_items: list[ActionItem]


class RoleRecommendation(BaseModel):
    title: str
    type: str
    match_reason: str


class JobRecommendationResponse(BaseModel):
    recommended_roles: list[RoleRecommendation]

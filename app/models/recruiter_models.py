from pydantic import BaseModel, Field


class CandidateEvaluation(BaseModel):
    name: str
    match_percentage: int = Field(ge=0, le=100)
    status: str
    rank: int = Field(ge=1)
    matched_skills: list[str]
    missing_skills: list[str]
    strengths: str
    weaknesses: str


class RecruiterScreeningResponse(BaseModel):
    mode: str = "recruiter"
    total_candidates: int
    shortlisted_count: int
    average_match: float
    highest_match: int
    candidates: list[CandidateEvaluation]

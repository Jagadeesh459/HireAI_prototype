import os
import shutil
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.models.student_models import (
    ActionTrackerRequest,
    ActionTrackerResponse,
    JobRecommendationResponse,
    ResumeReviewResponse,
    SkillEvaluationRequest,
    SkillEvaluationResponse,
)
from app.services.pdf_parser import extract_text_from_pdf
from app.services.student_engine import (
    run_action_tracker,
    run_resume_review,
    run_role_recommendations,
    run_skill_evaluation,
)

router = APIRouter(prefix="/api/student", tags=["Student"])


def _save_resume(file: UploadFile) -> str:
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported.")
    settings.TEMP_RESUME_DIR.mkdir(parents=True, exist_ok=True)
    path = settings.TEMP_RESUME_DIR / f"{uuid.uuid4().hex}_{file.filename}"
    with path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return str(path)


@router.post("/resume-review", response_model=ResumeReviewResponse)
async def resume_review(
    resume: UploadFile = File(...),
    desired_role: str | None = Form(default=None),
):
    path = _save_resume(resume)
    try:
        resume_text = extract_text_from_pdf(path)
        if len(resume_text.strip()) < 80:
            raise HTTPException(
                status_code=400,
                detail="Resume text could not be extracted. Upload a text-based PDF (not image-only).",
            )
        return run_resume_review(resume_text, desired_role)
    finally:
        if os.path.exists(path):
            os.remove(path)


@router.post("/skill-evaluation", response_model=SkillEvaluationResponse)
async def skill_evaluation(payload: SkillEvaluationRequest):
    if not payload.known_skills:
        raise HTTPException(status_code=400, detail="known_skills must contain at least one skill.")
    return run_skill_evaluation(
        known_skills=payload.known_skills,
        interests=payload.interests,
        preferred_domains=payload.preferred_domains,
    )


@router.post("/recommendations", response_model=JobRecommendationResponse)
async def role_recommendations(resume: UploadFile = File(...)):
    path = _save_resume(resume)
    try:
        resume_text = extract_text_from_pdf(path)
        if len(resume_text.strip()) < 80:
            raise HTTPException(
                status_code=400,
                detail="Resume text could not be extracted. Upload a text-based PDF (not image-only).",
            )
        return run_role_recommendations(resume_text)
    finally:
        if os.path.exists(path):
            os.remove(path)


@router.post("/action-tracker", response_model=ActionTrackerResponse)
async def action_tracker(payload: ActionTrackerRequest):
    return run_action_tracker(
        desired_role=payload.desired_role,
        resume_strengths=payload.resume_strengths,
        resume_weaknesses=payload.resume_weaknesses,
        missing_technical_skills=payload.missing_technical_skills,
        missing_soft_skills=payload.missing_soft_skills,
        roadmap=payload.roadmap,
    )

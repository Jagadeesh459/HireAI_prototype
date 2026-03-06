from fastapi import APIRouter, File, Form, UploadFile

from app.models.recruiter_models import RecruiterScreeningResponse
from app.services.recruiter_engine import run_recruiter_screening

router = APIRouter(prefix="/api/recruiter", tags=["Recruiter"])


@router.post("/screen", response_model=RecruiterScreeningResponse)
async def screen_candidates(
    job_description: str = Form(...),
    resumes: list[UploadFile] = File(...),
):
    return run_recruiter_screening(job_description, resumes)

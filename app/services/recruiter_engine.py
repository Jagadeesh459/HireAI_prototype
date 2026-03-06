import os
import shutil
import uuid
from pathlib import Path
from typing import Any

from fastapi import UploadFile

from app.core.config import settings
from app.services.decision_engine import decide_candidate_status
from app.services.gemini_service import analyze_recruiter_resume
from app.services.pdf_parser import extract_text_from_pdf
from app.services.ranking_engine import rank_candidates, summarize_recruiter_results


def _save_upload(file: UploadFile) -> Path:
    settings.TEMP_RESUME_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{file.filename}"
    out_path = settings.TEMP_RESUME_DIR / safe_name
    with out_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return out_path


def run_recruiter_screening(job_description: str, resumes: list[UploadFile]) -> dict[str, Any]:
    candidates: list[dict[str, Any]] = []

    for resume in resumes:
        saved_path = _save_upload(resume)
        try:
            resume_text = extract_text_from_pdf(str(saved_path))
            analysis = analyze_recruiter_resume(resume_text, job_description)
            match = int(analysis.get("match_percentage", 0))
            candidate = {
                "name": resume.filename,
                "match_percentage": match,
                "status": decide_candidate_status(match),
                "rank": 0,
                "matched_skills": analysis.get("matched_skills", []),
                "missing_skills": analysis.get("missing_skills", []),
                "strengths": analysis.get("candidate_strengths", ""),
                "weaknesses": analysis.get("candidate_weaknesses", ""),
            }
            candidates.append(candidate)
        except Exception as exc:
            candidates.append(
                {
                    "name": resume.filename,
                    "match_percentage": 0,
                    "status": "REJECTED",
                    "rank": 0,
                    "matched_skills": [],
                    "missing_skills": [],
                    "strengths": "",
                    "weaknesses": f"Processing failed: {exc}",
                }
            )
        finally:
            if saved_path.exists():
                os.remove(saved_path)

    ranked = rank_candidates(candidates)
    summary = summarize_recruiter_results(ranked)
    return {"mode": "recruiter", **summary, "candidates": ranked}

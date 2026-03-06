import json
import re
from typing import Any

from app.core.config import settings

try:
    from google import genai
except Exception:  # pragma: no cover - dependency may be missing in local env
    genai = None


def _extract_json_block(raw_text: str) -> dict[str, Any]:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in model response.")
    return json.loads(cleaned[start : end + 1])


def _client():
    if not settings.GEMINI_API_KEY or genai is None:
        return None
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _response_text(response: Any) -> str:
    text = getattr(response, "text", None)
    if text:
        return text

    # Some SDK responses may not populate `.text` directly.
    candidates = getattr(response, "candidates", None)
    if not candidates:
        return ""
    try:
        parts = candidates[0].content.parts
        return "".join(getattr(part, "text", "") for part in parts).strip()
    except Exception:
        return ""


def _generate_json(prompt: str) -> dict[str, Any]:
    client = _client()
    if client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set in environment.")
        raise RuntimeError("google-genai package is not installed in active Python environment.")

    models = []
    for model in [settings.GEMINI_MODEL, "models/gemini-2.5-flash", "models/gemini-2.0-flash", "models/gemini-flash-latest"]:
        if model and model not in models:
            models.append(model)

    last_error = None
    for model_name in models:
        try:
            # Prefer structured JSON output to avoid markdown wrappers.
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config={"response_mime_type": "application/json"},
            )
            text = _response_text(response)
            if not text:
                raise RuntimeError(f"Empty response text from model {model_name}.")
            return _extract_json_block(text)
        except Exception as exc:  # pragma: no cover - runtime/API-specific
            last_error = exc
            continue

    raise RuntimeError(f"Gemini request failed across models: {last_error}")


def _normalize_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def _short_text(value: Any, max_words: int = 22) -> str:
    text = str(value or "").strip()
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]).rstrip(",;:.") + "..."


def _compact_skills(value: Any, max_items: int = 8) -> list[str]:
    items = _normalize_list(value)
    compact: list[str] = []
    seen: set[str] = set()
    for item in items:
        cleaned = " ".join(item.replace("\n", " ").split())
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        compact.append(cleaned)
        if len(compact) >= max_items:
            break
    return compact


def analyze_recruiter_resume(resume_text: str, job_description: str) -> dict[str, Any]:
    prompt = f"""
You are an expert technical recruiter.

Compare the resume with the job description.
Return only valid JSON with this exact structure:
{{
  "match_percentage": 0,
  "matched_skills": [],
  "missing_skills": [],
  "candidate_strengths": "",
  "candidate_weaknesses": ""
}}

Strict output rules:
- Keep "candidate_strengths" to ONE sentence, max 20 words.
- Keep "candidate_weaknesses" to ONE sentence, max 20 words.
- "matched_skills": max 8 short items.
- "missing_skills": max 6 short items.
- No extra keys. No markdown.

Job Description:
{job_description}

Resume:
{resume_text}
"""
    error_reason = ""
    try:
        result = _generate_json(prompt)
    except Exception as exc:
        print(f"[HireAI][Gemini][Recruiter] {exc}")
        result = None
        error_reason = str(exc)

    if not result:
        return {
            "match_percentage": 55,
            "matched_skills": [],
            "missing_skills": [],
            "candidate_strengths": "Resume parsed successfully but AI analysis fallback was used.",
            "candidate_weaknesses": f"Gemini unavailable/invalid JSON. {error_reason}".strip(),
        }

    return {
        "match_percentage": int(max(0, min(100, result.get("match_percentage", 0)))),
        "matched_skills": _compact_skills(result.get("matched_skills"), max_items=8),
        "missing_skills": _compact_skills(result.get("missing_skills"), max_items=6),
        "candidate_strengths": _short_text(result.get("candidate_strengths", ""), max_words=20),
        "candidate_weaknesses": _short_text(result.get("candidate_weaknesses", ""), max_words=20),
    }


def analyze_student_resume(resume_text: str, desired_role: str | None = None) -> dict[str, Any]:
    role_text = desired_role or "Not provided"
    prompt = f"""
You are a career mentor.

Analyze this resume for the desired role.
Return only valid JSON:
{{
  "overall_score": 0,
  "resume_strengths": "",
  "resume_weaknesses": "",
  "improvement_suggestions": "",
  "missing_technical_skills": [],
  "missing_soft_skills": []
}}

Strict output rules:
- Keep each string field under 22 words.
- Keep missing_technical_skills and missing_soft_skills to max 6 items each.
- No markdown and no extra keys.

Desired Role:
{role_text}

Resume:
{resume_text}
"""
    try:
        result = _generate_json(prompt)
    except Exception as exc:
        print(f"[HireAI][Gemini][StudentResume] {exc}")
        result = None

    if not result:
        return {
            "overall_score": 60,
            "resume_strengths": "Clear educational and project details.",
            "resume_weaknesses": "Could include stronger quantified impact.",
            "improvement_suggestions": "Add measurable outcomes and modern tooling exposure.",
            "missing_technical_skills": ["Docker", "Cloud basics"],
            "missing_soft_skills": ["Stakeholder communication"],
        }

    return {
        "overall_score": int(max(0, min(100, result.get("overall_score", 0)))),
        "resume_strengths": _short_text(result.get("resume_strengths", ""), max_words=22),
        "resume_weaknesses": _short_text(result.get("resume_weaknesses", ""), max_words=22),
        "improvement_suggestions": _short_text(result.get("improvement_suggestions", ""), max_words=26),
        "missing_technical_skills": _compact_skills(result.get("missing_technical_skills"), max_items=6),
        "missing_soft_skills": _compact_skills(result.get("missing_soft_skills"), max_items=6),
    }


def evaluate_skill_profile(
    known_skills: list[str], interests: list[str], preferred_domains: list[str]
) -> dict[str, Any]:
    prompt = f"""
Based on this student profile, return only valid JSON:
{{
  "best_roles": [],
  "internship_domains": [],
  "skills_to_learn": [],
  "roadmap": ""
}}

Strict output rules:
- best_roles: max 5 short role titles.
- internship_domains: max 5 items.
- skills_to_learn: max 8 items.
- roadmap: 3 short steps in one sentence, max 35 words.
- No markdown and no extra keys.

Known skills: {known_skills}
Interests: {interests}
Preferred domains: {preferred_domains}
"""
    try:
        result = _generate_json(prompt)
    except Exception as exc:
        print(f"[HireAI][Gemini][SkillEval] {exc}")
        result = None

    if not result:
        return {
            "best_roles": ["Backend Developer", "Data Analyst"],
            "internship_domains": preferred_domains or ["Web Development"],
            "skills_to_learn": ["Docker", "GitHub Actions", "AWS basics"],
            "roadmap": "Months 1-3: strengthen DSA and backend projects; Months 4-6: deploy end-to-end apps; Months 7-12: target internships and interview prep.",
        }

    return {
        "best_roles": _compact_skills(result.get("best_roles"), max_items=5),
        "internship_domains": _compact_skills(result.get("internship_domains"), max_items=5),
        "skills_to_learn": _compact_skills(result.get("skills_to_learn"), max_items=8),
        "roadmap": _short_text(result.get("roadmap", ""), max_words=35),
    }


def recommend_market_roles(resume_text: str) -> dict[str, Any]:
    prompt = f"""
Based on this resume, suggest currently in-demand roles.
Return only valid JSON:
{{
  "recommended_roles": [
    {{
      "title": "",
      "type": "",
      "match_reason": ""
    }}
  ]
}}

Strict output rules:
- Return 3 to 6 roles.
- title and type must be short.
- match_reason max 16 words.
- No markdown and no extra keys.

Resume:
{resume_text}
"""
    try:
        result = _generate_json(prompt)
    except Exception as exc:
        print(f"[HireAI][Gemini][Recommendations] {exc}")
        result = None

    if not result:
        return {
            "recommended_roles": [
                {
                    "title": "Junior Python Developer",
                    "type": "Internship",
                    "match_reason": "Strong backend fundamentals and project alignment.",
                }
            ]
        }

    normalized = []
    for item in result.get("recommended_roles", []):
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "title": _short_text(item.get("title", ""), max_words=6),
                "type": _short_text(item.get("type", ""), max_words=2),
                "match_reason": _short_text(item.get("match_reason", ""), max_words=16),
            }
        )
    return {"recommended_roles": normalized[:6]}


def generate_student_action_tracker(
    desired_role: str | None,
    resume_strengths: str,
    resume_weaknesses: str,
    missing_technical_skills: list[str],
    missing_soft_skills: list[str],
    roadmap: str,
) -> dict[str, Any]:
    prompt = f"""
You are a career coach.

Create an action tracker for the next 2-3 weeks.
Return only valid JSON:
{{
  "action_items": [
    {{
      "task": "",
      "category": "",
      "priority": ""
    }}
  ]
}}

Strict output rules:
- Return exactly 4 to 6 action_items.
- task: one short actionable sentence (max 14 words).
- category: one of ["Resume", "Skill", "Project", "Interview", "Applications"].
- priority: one of ["High", "Medium", "Low"].
- No markdown and no extra keys.

Desired role: {desired_role or "Not provided"}
Resume strengths: {resume_strengths}
Resume weaknesses: {resume_weaknesses}
Missing technical skills: {missing_technical_skills}
Missing soft skills: {missing_soft_skills}
Roadmap: {roadmap}
"""

    try:
        result = _generate_json(prompt)
    except Exception as exc:
        print(f"[HireAI][Gemini][ActionTracker] {exc}")
        result = None

    if not result:
        return {
            "action_items": [
                {"task": "Update resume bullets with quantified impact for 2 projects.", "category": "Resume", "priority": "High"},
                {"task": "Complete one mini-project using Docker and deploy it.", "category": "Project", "priority": "High"},
                {"task": "Practice 20 role-specific interview questions this week.", "category": "Interview", "priority": "Medium"},
                {"task": "Apply to 10 matching internships with tailored resume.", "category": "Applications", "priority": "Medium"},
            ]
        }

    items = []
    valid_categories = {"Resume", "Skill", "Project", "Interview", "Applications"}
    valid_priorities = {"High", "Medium", "Low"}

    for item in result.get("action_items", []):
        if not isinstance(item, dict):
            continue
        task = _short_text(item.get("task", ""), max_words=14)
        category = str(item.get("category", "Skill")).strip().title()
        priority = str(item.get("priority", "Medium")).strip().title()
        if category not in valid_categories:
            category = "Skill"
        if priority not in valid_priorities:
            priority = "Medium"
        if task:
            items.append({"task": task, "category": category, "priority": priority})
        if len(items) >= 6:
            break

    return {"action_items": items[:6]}

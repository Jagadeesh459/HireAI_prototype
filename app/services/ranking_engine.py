from typing import Any


def rank_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked = sorted(candidates, key=lambda item: item["match_percentage"], reverse=True)
    for idx, candidate in enumerate(ranked, start=1):
        candidate["rank"] = idx
    return ranked


def summarize_recruiter_results(candidates: list[dict[str, Any]]) -> dict[str, Any]:
    if not candidates:
        return {
            "total_candidates": 0,
            "shortlisted_count": 0,
            "average_match": 0.0,
            "highest_match": 0,
        }

    total = len(candidates)
    shortlisted = len([c for c in candidates if c["status"] == "SHORTLISTED"])
    avg_match = sum(c["match_percentage"] for c in candidates) / total
    highest = max(c["match_percentage"] for c in candidates)
    return {
        "total_candidates": total,
        "shortlisted_count": shortlisted,
        "average_match": round(avg_match, 2),
        "highest_match": highest,
    }

def decide_candidate_status(match_percentage: int) -> str:
    if match_percentage >= 75:
        return "SHORTLISTED"
    if match_percentage >= 50:
        return "HOLD"
    return "REJECTED"

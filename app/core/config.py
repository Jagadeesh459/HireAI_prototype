import os
from pathlib import Path


class Settings:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "models/gemini-2.5-flash")
    TEMP_RESUME_DIR = Path(os.getenv("TEMP_RESUME_DIR", "temp_resumes"))


settings = Settings()

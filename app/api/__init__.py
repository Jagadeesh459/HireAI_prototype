from app.api.auth_routes import router as auth_router
from app.api.recruiter_routes import router as recruiter_router
from app.api.student_routes import router as student_router

__all__ = ["recruiter_router", "student_router", "auth_router"]

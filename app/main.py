from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth_routes import router as auth_router
from app.api.recruiter_routes import router as recruiter_router
from app.api.student_routes import router as student_router

app = FastAPI(title="HireAI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recruiter_router)
app.include_router(student_router)
app.include_router(auth_router)


@app.get("/")
def home():
    return {"message": "HireAI backend running"}

from fastapi import APIRouter

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.get("/health")
async def auth_health():
    return {"message": "Auth module placeholder"}

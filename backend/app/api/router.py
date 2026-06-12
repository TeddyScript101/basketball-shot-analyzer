from fastapi import APIRouter

from .auth import router as auth_router
from .users import router as users_router
from .videos import router as videos_router
from .analyses import router as analyses_router
from .dashboard import router as dashboard_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(videos_router)
api_router.include_router(analyses_router)
api_router.include_router(dashboard_router)

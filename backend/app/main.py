import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.config import settings
from .api.router import api_router
from .db.session import engine
from .db.base import Base
from .models import User, Video, VideoStatus, Analysis, Metric, Recommendation  # noqa: register models


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def corp_for_uploads(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/uploads/"):
        response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
    return response

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR, check_dir=False), name="uploads")
app.include_router(api_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.VERSION}

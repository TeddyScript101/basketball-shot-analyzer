import uuid
import os
import aiofiles

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..db.session import get_db
from ..core.dependencies import get_current_user
from ..core.config import settings
from ..models.user import User
from ..models.video import Video, VideoStatus
from ..models.analysis import Analysis
from ..schemas.video import VideoResponse, VideoListItem
from ..services.analysis_service import run_analysis

router = APIRouter(prefix="/videos", tags=["Videos"])

ALLOWED_MIME_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/x-matroska"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB


@router.post("/upload", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    original_duration: float = Form(default=None),
    selected_start_time: float = Form(default=None),
    selected_end_time: float = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Upload MP4, MOV, WebM, or MKV.",
        )

    if selected_start_time is not None and selected_end_time is not None:
        duration = selected_end_time - selected_start_time
        if duration > settings.MAX_VIDEO_DURATION:
            raise HTTPException(
                status_code=422,
                detail=f"Clip duration {duration:.1f}s exceeds maximum of {settings.MAX_VIDEO_DURATION}s.",
            )
        if duration <= 0:
            raise HTTPException(status_code=422, detail="End time must be after start time.")

    ext = os.path.splitext(file.filename or "video.mp4")[1].lower() or ".mp4"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    file_size = 0
    async with aiofiles.open(file_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE:
                os.unlink(file_path)
                raise HTTPException(status_code=413, detail="File too large. Maximum 500 MB.")
            await out.write(chunk)

    processed_duration = None
    if selected_start_time is not None and selected_end_time is not None:
        processed_duration = selected_end_time - selected_start_time

    video = Video(
        user_id=current_user.id,
        filename=filename,
        original_filename=file.filename or filename,
        file_path=file_path,
        file_size=file_size,
        original_duration=original_duration,
        selected_start_time=selected_start_time,
        selected_end_time=selected_end_time,
        processed_duration=processed_duration,
        status=VideoStatus.PENDING,
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)

    background_tasks.add_task(run_analysis, video.id, db)

    return video


@router.get("", response_model=list[VideoListItem])
async def list_videos(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Video)
        .where(Video.user_id == current_user.id)
        .options(selectinload(Video.analysis))
        .order_by(Video.created_at.desc())
    )
    videos = result.scalars().all()

    items = []
    for v in videos:
        item = VideoListItem.model_validate(v)
        if v.analysis:
            item.analysis_score = v.analysis.score
        items.append(item)
    return items


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

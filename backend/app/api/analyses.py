from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..db.session import get_db
from ..core.dependencies import get_current_user
from ..models.user import User
from ..models.video import Video
from ..models.analysis import Analysis
from ..schemas.analysis import AnalysisResponse, AnalysisListItem

router = APIRouter(prefix="/analyses", tags=["Analyses"])


@router.get("", response_model=list[AnalysisListItem])
async def list_analyses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Analysis)
        .join(Video, Analysis.video_id == Video.id)
        .where(Video.user_id == current_user.id)
        .options(selectinload(Analysis.video))
        .order_by(Analysis.created_at.desc())
    )
    analyses = result.scalars().all()

    return [
        AnalysisListItem(
            id=a.id,
            video_id=a.video_id,
            score=a.score,
            created_at=a.created_at,
            video_filename=a.video.original_filename if a.video else None,
        )
        for a in analyses
    ]


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Analysis)
        .join(Video, Analysis.video_id == Video.id)
        .where(Analysis.id == analysis_id, Video.user_id == current_user.id)
        .options(
            selectinload(Analysis.metrics),
            selectinload(Analysis.recommendations),
            selectinload(Analysis.video),
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis

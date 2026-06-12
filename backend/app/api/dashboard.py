from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from ..db.session import get_db
from ..core.dependencies import get_current_user
from ..models.user import User
from ..models.video import Video
from ..models.analysis import Analysis, Metric
from ..schemas.dashboard import DashboardResponse, DashboardStats, ScoreHistoryPoint, MetricAverage

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analyses_result = await db.execute(
        select(Analysis)
        .join(Video, Analysis.video_id == Video.id)
        .where(Video.user_id == current_user.id, Analysis.score.isnot(None))
        .options(selectinload(Analysis.video), selectinload(Analysis.metrics))
        .order_by(Analysis.created_at.asc())
    )
    analyses = analyses_result.scalars().all()

    scores = [a.score for a in analyses if a.score is not None]
    total = len(analyses)
    avg_score = round(sum(scores) / len(scores), 1) if scores else None
    best_score = round(max(scores), 1) if scores else None
    latest_score = round(scores[-1], 1) if scores else None

    improvement_delta = None
    if len(scores) >= 2:
        improvement_delta = round(scores[-1] - scores[0], 1)

    score_history = [
        ScoreHistoryPoint(
            date=a.created_at,
            score=a.score,
            analysis_id=a.id,
            video_filename=a.video.original_filename if a.video else f"Video {a.video_id}",
        )
        for a in analyses
        if a.score is not None
    ]

    metric_sums: dict[str, list[float]] = {}
    metric_meta: dict[str, dict] = {}
    for a in analyses:
        for m in a.metrics:
            if m.metric_value is not None:
                metric_sums.setdefault(m.metric_name, []).append(m.metric_value)
                metric_meta[m.metric_name] = {
                    "ideal_min": m.ideal_min,
                    "ideal_max": m.ideal_max,
                    "unit": m.metric_unit,
                }

    metric_averages = [
        MetricAverage(
            metric_name=name,
            average_value=round(sum(vals) / len(vals), 2),
            ideal_min=metric_meta[name]["ideal_min"],
            ideal_max=metric_meta[name]["ideal_max"],
            metric_unit=metric_meta[name]["unit"],
        )
        for name, vals in metric_sums.items()
    ]

    recent = [
        {
            "id": a.id,
            "video_id": a.video_id,
            "score": a.score,
            "created_at": a.created_at.isoformat(),
            "video_filename": a.video.original_filename if a.video else f"Video {a.video_id}",
        }
        for a in reversed(analyses[-5:])
    ]

    return DashboardResponse(
        stats=DashboardStats(
            total_analyses=total,
            average_score=avg_score,
            best_score=best_score,
            latest_score=latest_score,
            improvement_delta=improvement_delta,
        ),
        score_history=score_history,
        metric_averages=metric_averages,
        recent_analyses=recent,
    )

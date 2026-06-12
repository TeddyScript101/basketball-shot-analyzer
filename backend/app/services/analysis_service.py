import os
import time
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.video import Video, VideoStatus
from ..models.analysis import Analysis, Metric, Recommendation
from ..cv.pose_analyzer import PoseAnalyzer
from ..cv.recommendations import generate_recommendations
from ..core.config import settings


METRIC_DEFINITIONS = [
    {
        "key": "release_angle",
        "name": "Release Angle",
        "unit": "degrees",
        "ideal_min": 45.0,
        "ideal_max": 55.0,
        "attr": "release_angle",
    },
    {
        "key": "elbow_angle",
        "name": "Elbow Angle at Release",
        "unit": "degrees",
        "ideal_min": 85.0,
        "ideal_max": 100.0,
        "attr": "elbow_angle_at_release",
    },
    {
        "key": "knee_angle",
        "name": "Knee Bend at Setup",
        "unit": "degrees",
        "ideal_min": 90.0,
        "ideal_max": 120.0,
        "attr": "knee_angle_at_setup",
    },
    {
        "key": "shoulder_alignment",
        "name": "Shoulder Alignment",
        "unit": "deviation",
        "ideal_min": 0.0,
        "ideal_max": 3.0,
        "attr": "shoulder_alignment",
    },
    {
        "key": "shot_duration",
        "name": "Shot Duration",
        "unit": "seconds",
        "ideal_min": 0.4,
        "ideal_max": 0.9,
        "attr": "shot_duration_seconds",
    },
    {
        "key": "jump_height",
        "name": "Jump Height Estimate",
        "unit": "normalized",
        "ideal_min": 0.03,
        "ideal_max": 0.12,
        "attr": "jump_height_estimate",
    },
    {
        "key": "release_consistency",
        "name": "Release Consistency",
        "unit": "score",
        "ideal_min": 75.0,
        "ideal_max": 100.0,
        "attr": "release_consistency",
    },
]


async def run_analysis(video_id: int, db: AsyncSession) -> None:
    """Background task: run CV analysis and persist results."""
    result = await db.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()
    if not video:
        return

    video.status = VideoStatus.PROCESSING
    await db.commit()

    analysis = Analysis(video_id=video_id)
    db.add(analysis)
    await db.flush()

    t_start = time.monotonic()
    try:
        loop = asyncio.get_event_loop()
        shooting_metrics = await loop.run_in_executor(
            None, _run_cv_analysis, video.file_path
        )

        analysis.score = shooting_metrics.overall_score
        analysis.shooting_arm = shooting_metrics.shooting_arm
        analysis.frames_analyzed = shooting_metrics.frames_analyzed
        analysis.processing_time_seconds = round(time.monotonic() - t_start, 2)

        # Generate pose visualization image
        pose_image_path = os.path.join(
            settings.UPLOAD_DIR, f"analysis_{analysis.id}_pose.jpg"
        )
        with PoseAnalyzer() as viz_analyzer:
            saved = viz_analyzer.generate_pose_image(shooting_metrics, pose_image_path)
        if saved:
            analysis.pose_image_path = pose_image_path

        for defn in METRIC_DEFINITIONS:
            value = getattr(shooting_metrics, defn["attr"], None)
            if value is not None:
                db.add(Metric(
                    analysis_id=analysis.id,
                    metric_name=defn["name"],
                    metric_value=value,
                    metric_unit=defn["unit"],
                    ideal_min=defn["ideal_min"],
                    ideal_max=defn["ideal_max"],
                ))

        recs = generate_recommendations(shooting_metrics)
        for rec in recs:
            db.add(Recommendation(
                analysis_id=analysis.id,
                recommendation_text=rec.text,
                metric_key=rec.metric_key,
                priority=rec.priority,
            ))

        video.status = VideoStatus.COMPLETE

    except Exception as exc:
        analysis.error_message = str(exc)
        analysis.processing_time_seconds = round(time.monotonic() - t_start, 2)
        video.status = VideoStatus.FAILED

    await db.commit()


def _run_cv_analysis(file_path: str):
    """Synchronous CV work executed in a thread pool."""
    with PoseAnalyzer() as analyzer:
        return analyzer.analyze_video(file_path)

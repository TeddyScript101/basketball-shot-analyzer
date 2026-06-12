from datetime import datetime

from sqlalchemy import Float, Integer, ForeignKey, DateTime, func, Text, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.base import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    video_id: Mapped[int] = mapped_column(
        ForeignKey("videos.id"), index=True, nullable=False, unique=True
    )
    score: Mapped[float | None] = mapped_column(Float)
    shooting_arm: Mapped[str | None] = mapped_column(String(10))
    frames_analyzed: Mapped[int | None] = mapped_column(Integer)
    processing_time_seconds: Mapped[float | None] = mapped_column(Float)
    error_message: Mapped[str | None] = mapped_column(Text)
    pose_image_path: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    video: Mapped["Video"] = relationship(back_populates="analysis")  # noqa: F821
    metrics: Mapped[list["Metric"]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan"
    )
    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan"
    )


class Metric(Base):
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("analyses.id"), index=True, nullable=False)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_value: Mapped[float | None] = mapped_column(Float)
    metric_unit: Mapped[str | None] = mapped_column(String(50))
    ideal_min: Mapped[float | None] = mapped_column(Float)
    ideal_max: Mapped[float | None] = mapped_column(Float)

    analysis: Mapped["Analysis"] = relationship(back_populates="metrics")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(primary_key=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("analyses.id"), index=True, nullable=False)
    recommendation_text: Mapped[str] = mapped_column(Text, nullable=False)
    metric_key: Mapped[str | None] = mapped_column(String(50))
    priority: Mapped[int] = mapped_column(Integer, default=2)

    analysis: Mapped["Analysis"] = relationship(back_populates="recommendations")

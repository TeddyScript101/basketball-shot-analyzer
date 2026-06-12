from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DashboardStats(BaseModel):
    total_analyses: int
    average_score: Optional[float]
    best_score: Optional[float]
    latest_score: Optional[float]
    improvement_delta: Optional[float]


class ScoreHistoryPoint(BaseModel):
    date: datetime
    score: float
    analysis_id: int
    video_filename: str


class MetricAverage(BaseModel):
    metric_name: str
    average_value: float
    ideal_min: Optional[float]
    ideal_max: Optional[float]
    metric_unit: Optional[str]


class DashboardResponse(BaseModel):
    stats: DashboardStats
    score_history: list[ScoreHistoryPoint]
    metric_averages: list[MetricAverage]
    recent_analyses: list[dict]

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MetricResponse(BaseModel):
    id: int
    metric_name: str
    metric_value: Optional[float]
    metric_unit: Optional[str]
    ideal_min: Optional[float]
    ideal_max: Optional[float]

    model_config = {"from_attributes": True}


class RecommendationResponse(BaseModel):
    id: int
    recommendation_text: str
    metric_key: Optional[str]
    priority: int

    model_config = {"from_attributes": True}


class AnalysisResponse(BaseModel):
    id: int
    video_id: int
    score: Optional[float]
    shooting_arm: Optional[str]
    frames_analyzed: Optional[int]
    processing_time_seconds: Optional[float]
    created_at: datetime
    metrics: list[MetricResponse]
    recommendations: list[RecommendationResponse]

    model_config = {"from_attributes": True}


class AnalysisListItem(BaseModel):
    id: int
    video_id: int
    score: Optional[float]
    created_at: datetime
    video_filename: Optional[str] = None

    model_config = {"from_attributes": True}

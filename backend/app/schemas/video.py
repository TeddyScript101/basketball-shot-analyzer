from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from ..models.video import VideoStatus


class VideoResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    original_filename: str
    file_size: Optional[int]
    original_duration: Optional[float]
    selected_start_time: Optional[float]
    selected_end_time: Optional[float]
    processed_duration: Optional[float]
    status: VideoStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class VideoListItem(BaseModel):
    id: int
    original_filename: str
    status: VideoStatus
    processed_duration: Optional[float]
    created_at: datetime
    analysis_score: Optional[float] = None

    model_config = {"from_attributes": True}

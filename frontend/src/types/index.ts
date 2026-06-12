export interface User {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export type VideoStatus = "pending" | "processing" | "complete" | "failed";

export interface Video {
  id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  file_size: number | null;
  original_duration: number | null;
  selected_start_time: number | null;
  selected_end_time: number | null;
  processed_duration: number | null;
  status: VideoStatus;
  created_at: string;
  analysis_score?: number | null;
}

export interface Metric {
  id: number;
  metric_name: string;
  metric_value: number | null;
  metric_unit: string | null;
  ideal_min: number | null;
  ideal_max: number | null;
}

export interface Recommendation {
  id: number;
  recommendation_text: string;
  metric_key: string | null;
  priority: number;
}

export interface Analysis {
  id: number;
  video_id: number;
  score: number | null;
  shooting_arm: string | null;
  frames_analyzed: number | null;
  processing_time_seconds: number | null;
  pose_image_url: string | null;
  created_at: string;
  metrics: Metric[];
  recommendations: Recommendation[];
}

export interface AnalysisListItem {
  id: number;
  video_id: number;
  score: number | null;
  created_at: string;
  video_filename: string | null;
}

export interface DashboardStats {
  total_analyses: number;
  average_score: number | null;
  best_score: number | null;
  latest_score: number | null;
  improvement_delta: number | null;
}

export interface ScoreHistoryPoint {
  date: string;
  score: number;
  analysis_id: number;
  video_filename: string;
}

export interface MetricAverage {
  metric_name: string;
  average_value: number;
  ideal_min: number | null;
  ideal_max: number | null;
  metric_unit: string | null;
}

export interface DashboardData {
  stats: DashboardStats;
  score_history: ScoreHistoryPoint[];
  metric_averages: MetricAverage[];
  recent_analyses: Array<{
    id: number;
    video_id: number;
    score: number | null;
    created_at: string;
    video_filename: string;
  }>;
}

import axios, { AxiosError } from "axios";
import type {
  AuthTokens,
  User,
  Video,
  Analysis,
  AnalysisListItem,
  DashboardData,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (data: { email: string; password: string; full_name?: string }): Promise<User> => {
    const res = await apiClient.post("/auth/register", data);
    return res.data;
  },
  login: async (data: { email: string; password: string }): Promise<AuthTokens> => {
    const res = await apiClient.post("/auth/login", data);
    return res.data;
  },
  me: async (): Promise<User> => {
    const res = await apiClient.get("/users/me");
    return res.data;
  },
};

export const videoApi = {
  upload: async (
    file: Blob,
    meta: {
      originalFilename: string;
      originalDuration?: number;
      selectedStartTime?: number;
      selectedEndTime?: number;
    },
    onProgress?: (pct: number) => void
  ): Promise<Video> => {
    const form = new FormData();
    form.append("file", file, meta.originalFilename);
    if (meta.originalDuration != null)
      form.append("original_duration", String(meta.originalDuration));
    if (meta.selectedStartTime != null)
      form.append("selected_start_time", String(meta.selectedStartTime));
    if (meta.selectedEndTime != null)
      form.append("selected_end_time", String(meta.selectedEndTime));

    const res = await apiClient.post("/videos/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return res.data;
  },

  list: async (): Promise<Video[]> => {
    const res = await apiClient.get("/videos");
    return res.data;
  },

  get: async (id: number): Promise<Video> => {
    const res = await apiClient.get(`/videos/${id}`);
    return res.data;
  },
};

export const analysisApi = {
  list: async (): Promise<AnalysisListItem[]> => {
    const res = await apiClient.get("/analyses");
    return res.data;
  },

  get: async (id: number): Promise<Analysis> => {
    const res = await apiClient.get(`/analyses/${id}`);
    return res.data;
  },
};

export const dashboardApi = {
  get: async (): Promise<DashboardData> => {
    const res = await apiClient.get("/dashboard");
    return res.data;
  },
};

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail[0]?.msg ?? "Validation error";
  }
  return "An unexpected error occurred";
}

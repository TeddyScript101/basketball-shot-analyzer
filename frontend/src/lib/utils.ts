import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function scoreToColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

export function scoreToGrade(score: number): string {
  if (score >= 88) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  return "D";
}

export function metricInRange(
  value: number,
  min: number | null,
  max: number | null
): boolean {
  if (min === null || max === null) return true;
  return value >= min && value <= max;
}

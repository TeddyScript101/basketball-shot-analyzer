"use client";

import { useRef, useCallback } from "react";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MAX_DURATION = 15;

interface Props {
  duration: number;
  startTime: number;
  endTime: number;
  onChange: (start: number, end: number) => void;
}

export function ClipTimelineSelector({ duration, startTime, endTime, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const clipDuration = endTime - startTime;
  const isValid = clipDuration > 0 && clipDuration <= MAX_DURATION;

  const posToTime = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 0;
      const { left, width } = track.getBoundingClientRect();
      return Math.max(0, Math.min(duration, ((clientX - left) / width) * duration));
    },
    [duration]
  );

  const startDrag = useCallback(
    (handle: "start" | "end") => (e: React.MouseEvent) => {
      e.preventDefault();
      const onMove = (ev: MouseEvent) => {
        const t = posToTime(ev.clientX);
        if (handle === "start") {
          onChange(Math.min(t, endTime - 0.5), endTime);
        } else {
          onChange(startTime, Math.max(t, startTime + 0.5));
        }
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [posToTime, startTime, endTime, onChange]
  );

  const startPct = (startTime / duration) * 100;
  const endPct = (endTime / duration) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDuration(startTime)}</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium",
              isValid ? "text-primary" : "text-destructive"
            )}
          >
            {formatDuration(clipDuration)} selected
          </span>
          {!isValid && clipDuration > MAX_DURATION && (
            <span className="text-destructive text-xs">Max 15s exceeded</span>
          )}
        </div>
        <span>{formatDuration(endTime)}</span>
      </div>

      <div
        ref={trackRef}
        className="relative h-8 bg-muted rounded-lg overflow-visible select-none cursor-default"
      >
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-2 bg-secondary rounded-full" />
        </div>

        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-4 rounded",
            isValid ? "bg-primary/30" : "bg-destructive/30"
          )}
          style={{
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
          }}
        />

        <div
          onMouseDown={startDrag("start")}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-6 rounded cursor-ew-resize z-10 flex items-center justify-center",
            isValid ? "bg-primary hover:bg-primary/80" : "bg-destructive hover:bg-destructive/80"
          )}
          style={{ left: `${startPct}%` }}
        >
          <div className="w-0.5 h-3 bg-white/50 rounded-full" />
        </div>

        <div
          onMouseDown={startDrag("end")}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-6 rounded cursor-ew-resize z-10 flex items-center justify-center",
            isValid ? "bg-primary hover:bg-primary/80" : "bg-destructive hover:bg-destructive/80"
          )}
          style={{ left: `${endPct}%` }}
        >
          <div className="w-0.5 h-3 bg-white/50 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Start Time</label>
          <input
            type="number"
            min={0}
            max={endTime - 0.5}
            step={0.1}
            value={startTime.toFixed(1)}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0, endTime)}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">End Time</label>
          <input
            type="number"
            min={startTime + 0.5}
            max={duration}
            step={0.1}
            value={endTime.toFixed(1)}
            onChange={(e) => onChange(startTime, parseFloat(e.target.value) || 0)}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {!isValid && clipDuration > MAX_DURATION && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
          Clip is {clipDuration.toFixed(1)}s — maximum allowed is {MAX_DURATION}s. Shorten the
          selection to proceed.
        </p>
      )}
    </div>
  );
}

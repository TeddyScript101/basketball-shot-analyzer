"use client";

import { useRef, useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface Props {
  src: string;
  startTime?: number;
  endTime?: number;
  onDurationLoaded: (duration: number) => void;
}

export function VideoPreviewPlayer({ src, startTime = 0, endTime = 0, onDurationLoaded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clipProgress, setClipProgress] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);

  const clipActive = endTime > startTime && endTime > 0;
  const clipDuration = clipActive ? endTime - startTime : 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      onDurationLoaded(video.duration);
      setDisplayTime(0);
    };

    const handleTimeUpdate = () => {
      const ct = video.currentTime;

      if (clipActive && ct >= endTime) {
        video.currentTime = startTime;
        return;
      }

      setDisplayTime(ct);
      if (clipActive) {
        setClipProgress(Math.max(0, Math.min(100, ((ct - startTime) / clipDuration) * 100)));
      } else if (isFinite(video.duration) && video.duration > 0) {
        setClipProgress((ct / video.duration) * 100);
      }
    };

    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onDurationLoaded, startTime, endTime, clipActive, clipDuration]);

  // Seek to startTime when clip boundaries change, but only if outside range
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration) || video.duration === 0) return;
    if (!clipActive) return;
    const ct = video.currentTime;
    if (ct < startTime || ct >= endTime) {
      video.currentTime = startTime;
    }
  }, [startTime, endTime, clipActive]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (clipActive) {
        const ct = video.currentTime;
        if (ct < startTime || ct >= endTime) {
          video.currentTime = startTime;
        }
      }
      video.play().catch((err) => {
        if (err.name !== "AbortError") console.error(err);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration) || video.duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (clipActive) {
      video.currentTime = startTime + pct * clipDuration;
    } else {
      video.currentTime = pct * video.duration;
    }
  };

  return (
    <div className="bg-black rounded-xl overflow-hidden space-y-0">
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video object-contain bg-black"
        preload="metadata"
        playsInline
      />
      <div className="bg-card border-x border-b border-border p-3 space-y-2">
        <div
          className="h-1.5 bg-secondary rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${clipProgress}%` }}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Play className="w-3.5 h-3.5 text-primary" />
            )}
          </button>
          <span className="text-xs text-muted-foreground font-mono">
            {clipActive
              ? `${formatDuration(Math.max(0, displayTime - startTime))} / ${formatDuration(clipDuration)}`
              : formatDuration(displayTime)}
          </span>
          {clipActive && (
            <span className="text-xs text-primary/60 font-mono ml-auto">
              {formatDuration(startTime)} – {formatDuration(endTime)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

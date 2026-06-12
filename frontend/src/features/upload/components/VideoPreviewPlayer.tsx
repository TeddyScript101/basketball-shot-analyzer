"use client";

import { useRef, useEffect, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface Props {
  src: string;
  currentTime?: number;
  onDurationLoaded: (duration: number) => void;
}

export function VideoPreviewPlayer({ src, currentTime, onDurationLoaded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      onDurationLoaded(video.duration);
      setDisplayTime(0);
    };
    const handleTimeUpdate = () => {
      setDisplayTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
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
  }, [onDurationLoaded]);

  useEffect(() => {
    if (currentTime !== undefined && videoRef.current) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * video.duration;
  };

  return (
    <div className="bg-black rounded-xl overflow-hidden space-y-0">
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video object-contain bg-black"
        playsInline
      />
      <div className="bg-card border-x border-b border-border p-3 space-y-2">
        <div
          className="h-1.5 bg-secondary rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
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
            {formatDuration(displayTime)}
          </span>
        </div>
      </div>
    </div>
  );
}

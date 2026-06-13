"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { useVideoClip } from "@/features/upload/hooks/useVideoClip";
import { VideoPreviewPlayer } from "@/features/upload/components/VideoPreviewPlayer";
import { ClipTimelineSelector } from "@/features/upload/components/ClipTimelineSelector";
import { videoApi, getApiError } from "@/lib/api";
import { cn, formatFileSize, formatDuration } from "@/lib/utils";

type Stage = "idle" | "selected" | "trimming" | "uploading" | "done" | "error";

export default function UploadPage() {
  const router = useRouter();
  const { clip, isTrimming, trimProgress, trimError, loadFile, setDuration, updateRange, trimClip, reset } =
    useVideoClip();
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [createdVideoId, setCreatedVideoId] = useState<number | null>(null);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        setStage("selected");
        loadFile(file);
      }
    },
    [loadFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setStage("selected");
        loadFile(file);
      }
    },
    [loadFile]
  );

  const handleDurationLoaded = useCallback(
    (duration: number) => {
      setDuration(duration);
    },
    [setDuration]
  );

  const handleSubmit = async () => {
    if (!clip.file || !clip.isValid) return;
    setErrorMsg("");

    try {
      setStage("trimming");
      const trimmed = await trimClip();
      if (!trimmed) throw new Error(trimError ?? "Trim failed");

      setStage("uploading");
      const video = await videoApi.upload(
        trimmed,
        {
          originalFilename: clip.file.name,
          originalDuration: clip.duration,
          selectedStartTime: clip.startTime,
          selectedEndTime: clip.endTime,
        },
        setUploadProgress
      );

      setCreatedVideoId(video.id);
      setStage("done");

      // Poll for analysis completion
      pollRef.current = setInterval(async () => {
        try {
          const { analysisApi } = await import("@/lib/api");
          const analyses = await analysisApi.list();
          const found = analyses.find((a) => a.video_id === video.id);
          if (found) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setAnalysisId(found.id);
          }
        } catch {}
      }, 2000);
    } catch (e) {
      setStage("error");
      setErrorMsg(getApiError(e));
    }
  };

  if (stage === "done") {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 py-20 animate-fade-in">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
        <div>
          <h2 className="text-2xl font-bold">Upload successful!</h2>
          <p className="text-muted-foreground mt-2">
            Your video is being analyzed. This typically takes 30-60 seconds.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          {analysisId ? (
            <button
              onClick={() => router.push(`/analysis/${analysisId}`)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-lg font-semibold"
            >
              View Analysis
            </button>
          ) : (
            <button
              onClick={() => router.push("/history")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing... Check History
            </button>
          )}
          <button
            onClick={() => { reset(); setStage("idle"); }}
            className="border border-border hover:bg-accent px-6 py-2.5 rounded-lg font-semibold"
          >
            Upload Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">New Analysis</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload a shooting video and select a 3-second clip (one shot)
        </p>
      </div>

      {stage === "idle" && (
        <div className="space-y-3">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border hover:border-primary rounded-xl p-12 text-center cursor-pointer transition-colors group"
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={handleFileInput}
            />
            <Upload className="w-12 h-12 text-muted-foreground group-hover:text-primary mx-auto mb-4 transition-colors" />
            <p className="text-lg font-medium mb-1">Drop your video here</p>
            <p className="text-sm text-muted-foreground">MP4, MOV, or WebM up to 500 MB</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 flex items-start gap-2.5">
            <span className="text-amber-400 text-sm mt-0.5">💡</span>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              <span className="font-semibold text-amber-300">Best results:</span> Film from a 45–90° side angle. Front-on shots hide elbow extension and knee depth, reducing analysis accuracy.
            </p>
          </div>
        </div>
      )}

      {stage === "selected" && clip.objectUrl && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{clip.file?.name}</p>
              <p className="text-xs text-muted-foreground">
                {clip.file && formatFileSize(clip.file.size)}
                {clip.duration > 0 && ` · ${formatDuration(clip.duration)}`}
              </p>
            </div>
            <button
              onClick={() => { reset(); setStage("idle"); }}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <VideoPreviewPlayer
            src={clip.objectUrl}
            startTime={clip.startTime}
            endTime={clip.endTime}
            onDurationLoaded={handleDurationLoaded}
          />

          {clip.duration > 0 && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-sm">Select Clip</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select one 3-second shot. Player loops the selected clip.
                </p>
              </div>
              <ClipTimelineSelector
                duration={clip.duration}
                startTime={clip.startTime}
                endTime={clip.endTime}
                onChange={updateRange}
              />
            </div>
          )}

          {(stage === "selected") && (
            <button
              onClick={handleSubmit}
              disabled={!clip.isValid || clip.duration === 0}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 py-3 rounded-lg font-semibold transition-colors"
            >
              Analyze Shot
            </button>
          )}
        </div>
      )}

      {(stage === "trimming" || stage === "uploading") && (
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-5">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <div>
            <p className="font-semibold">
              {stage === "trimming" ? "Trimming clip in browser..." : "Uploading & analyzing..."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {stage === "trimming"
                ? "Using FFmpeg.wasm — no server upload needed"
                : "AI analysis will begin immediately"}
            </p>
          </div>
          <div className="max-w-xs mx-auto space-y-1">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width: `${stage === "trimming" ? trimProgress : uploadProgress}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {stage === "trimming" ? trimProgress : uploadProgress}%
            </p>
          </div>
        </div>
      )}

      {stage === "error" && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Upload failed</p>
            <p className="text-sm text-muted-foreground mt-0.5">{errorMsg}</p>
          </div>
          <button
            onClick={() => setStage("selected")}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

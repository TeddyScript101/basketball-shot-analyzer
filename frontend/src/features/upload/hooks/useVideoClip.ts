"use client";

import { useState, useRef, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export interface ClipState {
  file: File | null;
  objectUrl: string | null;
  duration: number;
  startTime: number;
  endTime: number;
  clipDuration: number;
  isValid: boolean;
}

const MAX_DURATION = 15;

export function useVideoClip() {
  const [clip, setClip] = useState<ClipState>({
    file: null,
    objectUrl: null,
    duration: 0,
    startTime: 0,
    endTime: 0,
    clipDuration: 0,
    isValid: false,
  });
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);
  const [trimError, setTrimError] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const loadFile = useCallback((file: File, videoDuration: number) => {
    const objectUrl = URL.createObjectURL(file);
    const end = Math.min(videoDuration, MAX_DURATION);
    setClip({
      file,
      objectUrl,
      duration: videoDuration,
      startTime: 0,
      endTime: end,
      clipDuration: end,
      isValid: end <= MAX_DURATION,
    });
    setTrimError(null);
  }, []);

  const updateRange = useCallback((start: number, end: number) => {
    const clipDuration = end - start;
    setClip((prev) => ({
      ...prev,
      startTime: start,
      endTime: end,
      clipDuration,
      isValid: clipDuration > 0 && clipDuration <= MAX_DURATION,
    }));
  }, []);

  const getFFmpeg = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    ffmpeg.on("progress", ({ progress }) => {
      setTrimProgress(Math.round(progress * 100));
    });
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const trimClip = useCallback(async (): Promise<Blob | null> => {
    if (!clip.file || !clip.isValid) return null;
    if (clip.clipDuration >= clip.duration - 0.5) {
      return clip.file;
    }

    setIsTrimming(true);
    setTrimProgress(0);
    setTrimError(null);

    try {
      const ffmpeg = await getFFmpeg();
      const ext = clip.file.name.match(/\.[^.]+$/)?.[0] ?? ".mp4";
      const inputName = "input" + ext;
      await ffmpeg.writeFile(inputName, await fetchFile(clip.file));

      await ffmpeg.exec([
        "-i", inputName,
        "-ss", clip.startTime.toFixed(3),
        "-t", clip.clipDuration.toFixed(3),
        "-c:v", "libx264",
        "-c:a", "aac",
        "-preset", "ultrafast",
        "-movflags", "+faststart",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      return new Blob([data], { type: "video/mp4" });
    } catch (err) {
      setTrimError(err instanceof Error ? err.message : "Trim failed");
      return null;
    } finally {
      setIsTrimming(false);
    }
  }, [clip]);

  const reset = useCallback(() => {
    if (clip.objectUrl) URL.revokeObjectURL(clip.objectUrl);
    setClip({
      file: null,
      objectUrl: null,
      duration: 0,
      startTime: 0,
      endTime: 0,
      clipDuration: 0,
      isValid: false,
    });
    setTrimError(null);
    setTrimProgress(0);
  }, [clip.objectUrl]);

  return {
    clip,
    isTrimming,
    trimProgress,
    trimError,
    loadFile,
    updateRange,
    trimClip,
    reset,
    MAX_DURATION,
  };
}

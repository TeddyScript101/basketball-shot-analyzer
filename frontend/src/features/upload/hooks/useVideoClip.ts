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

const MAX_DURATION = 3;

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

  // Call once when file is picked. Creates the objectUrl.
  const loadFile = useCallback((file: File) => {
    setClip((prev) => {
      if (prev.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return {
        file,
        objectUrl: URL.createObjectURL(file),
        duration: 0,
        startTime: 0,
        endTime: 0,
        clipDuration: 0,
        isValid: false,
      };
    });
    setTrimError(null);
  }, []);

  // Call once video metadata loads with the real duration. Never recreates objectUrl.
  const setDuration = useCallback((duration: number) => {
    const end = Math.min(duration, MAX_DURATION);
    setClip((prev) => ({
      ...prev,
      duration,
      endTime: end,
      clipDuration: end,
      isValid: end > 0 && end <= MAX_DURATION,
    }));
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
      return new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });
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
    setDuration,
    updateRange,
    trimClip,
    reset,
    MAX_DURATION,
  };
}

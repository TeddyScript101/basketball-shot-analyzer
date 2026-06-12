"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { analysisApi } from "@/lib/api";
import { ScoreBreakdown } from "@/features/analysis/components/ScoreBreakdown";
import { MetricsCards } from "@/features/analysis/components/MetricsCards";
import { MetricsRadarChart } from "@/features/analysis/components/MetricsRadarChart";
import { Recommendations } from "@/features/analysis/components/Recommendations";

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => analysisApi.get(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">Analysis not found or you don&apos;t have access.</p>
        <button
          onClick={() => router.push("/history")}
          className="text-sm text-primary hover:underline"
        >
          Back to history
        </button>
      </div>
    );
  }

  if (analysis.score === null) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <div className="text-center">
          <p className="font-medium">Analysis in progress</p>
          <p className="text-sm text-muted-foreground mt-1">
            MediaPipe is processing your video. Check back in a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Shot Analysis Report</h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(analysis.created_at), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ScoreBreakdown
            score={analysis.score}
            shootingArm={analysis.shooting_arm}
            framesAnalyzed={analysis.frames_analyzed}
            processingTime={analysis.processing_time_seconds}
          />
        </div>
        <div className="lg:col-span-2">
          <MetricsRadarChart metrics={analysis.metrics} />
        </div>
      </div>

      {analysis.pose_image_url && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          <div>
            <h3 className="font-semibold">Pose Visualization</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              MediaPipe skeleton overlay at detected release frame
            </p>
          </div>
          <img
            src={analysis.pose_image_url}
            alt="Pose skeleton at release frame"
            className="w-full rounded-lg object-contain bg-black max-h-[480px]"
          />
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Metrics Detail
        </h2>
        <MetricsCards metrics={analysis.metrics} />
      </div>

      {analysis.recommendations.length > 0 && (
        <Recommendations recommendations={analysis.recommendations} />
      )}
    </div>
  );
}

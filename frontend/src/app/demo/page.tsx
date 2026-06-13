"use client";

import { ScoreBreakdown } from "@/features/analysis/components/ScoreBreakdown";
import { MetricsCards } from "@/features/analysis/components/MetricsCards";
import { MetricsRadarChart } from "@/features/analysis/components/MetricsRadarChart";
import { Recommendations } from "@/features/analysis/components/Recommendations";
import type { Metric, Recommendation } from "@/types";

const DEMO_SCORE = 76.3;
const DEMO_SHOOTING_ARM = "right";
const DEMO_FRAMES = 207;
const DEMO_PROCESSING_TIME = 28.58;
const DEMO_DATE = "June 13, 2026 at 12:03 PM";

const DEMO_METRICS: Metric[] = [
  { id: 91, metric_name: "Release Angle",         metric_value: 67.4,  metric_unit: "degrees",    ideal_min: 45,   ideal_max: 55   },
  { id: 92, metric_name: "Elbow Angle at Release", metric_value: 179.7, metric_unit: "degrees",    ideal_min: 155,  ideal_max: 175  },
  { id: 93, metric_name: "Knee Bend at Setup",     metric_value: 116.6, metric_unit: "degrees",    ideal_min: 70,   ideal_max: 120  },
  { id: 94, metric_name: "Shoulder Alignment",     metric_value: 0.71,  metric_unit: "deviation",  ideal_min: 0,    ideal_max: 3    },
  { id: 95, metric_name: "Shot Duration",          metric_value: 0.61,  metric_unit: "seconds",    ideal_min: 0.4,  ideal_max: 0.9  },
  { id: 96, metric_name: "Jump Height Estimate",   metric_value: 0.089, metric_unit: "normalized", ideal_min: 0.02, ideal_max: 0.18 },
  { id: 97, metric_name: "Motion Smoothness",      metric_value: 93.3,  metric_unit: "score",      ideal_min: 75,   ideal_max: 100  },
];

const DEMO_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 28,
    recommendation_text: "Release angle of 67° is too high. Overly looping shots lose velocity and consistency. Target 45-55°.",
    metric_key: "release_angle",
    priority: 2,
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Shot Analysis Report</h1>
            <p className="text-xs text-muted-foreground">{DEMO_DATE}</p>
          </div>
          <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 font-medium flex-shrink-0">
            Demo
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <ScoreBreakdown
              score={DEMO_SCORE}
              shootingArm={DEMO_SHOOTING_ARM}
              framesAnalyzed={DEMO_FRAMES}
              processingTime={DEMO_PROCESSING_TIME}
            />
          </div>
          <div className="lg:col-span-2">
            <MetricsRadarChart metrics={DEMO_METRICS} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          <div>
            <h3 className="font-semibold">Pose Visualization</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              MediaPipe skeleton overlay: Loading → Release
            </p>
          </div>
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/demo-pose.jpg`}
            alt="Pose skeleton overlay"
            className="w-full rounded-lg object-contain bg-black max-h-[480px]"
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Metrics Detail
          </h2>
          <MetricsCards metrics={DEMO_METRICS} />
        </div>

        <Recommendations recommendations={DEMO_RECOMMENDATIONS} />

        <p className="text-xs text-muted-foreground text-center pb-4">
          Built with MediaPipe Pose · FastAPI · Next.js
        </p>
      </div>
    </div>
  );
}

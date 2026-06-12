"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from "recharts";
import type { Metric } from "@/types";

interface Props {
  metrics: Metric[];
}

function normalizeMetric(m: Metric): number {
  if (m.metric_value == null || m.ideal_min == null || m.ideal_max == null) return 50;
  const center = (m.ideal_min + m.ideal_max) / 2;
  const halfRange = (m.ideal_max - m.ideal_min) / 2;
  const distance = Math.abs(m.metric_value - center);
  return Math.max(0, Math.round(100 - (distance / (halfRange * 2.5)) * 100));
}

const SHORT_NAMES: Record<string, string> = {
  "Release Angle": "Release",
  "Elbow Angle at Release": "Elbow",
  "Knee Bend at Setup": "Knee Bend",
  "Shoulder Alignment": "Shoulder",
  "Shot Duration": "Duration",
  "Jump Height Estimate": "Jump",
  "Release Consistency": "Consistency",
};

export function MetricsRadarChart({ metrics }: Props) {
  const data = metrics.map((m) => ({
    name: SHORT_NAMES[m.metric_name] ?? m.metric_name,
    score: normalizeMetric(m),
    raw: m.metric_value,
    unit: m.metric_unit,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-semibold mb-1">Mechanics Breakdown</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Each axis shows how close the metric is to ideal range
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="hsl(217 33% 16%)" />
          <PolarAngleAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "hsl(215 20% 55%)" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 8%)",
              border: "1px solid hsl(217 33% 16%)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(_, __, props) => [
              `${props.payload.raw?.toFixed(1) ?? "—"} ${props.payload.unit ?? ""}`,
              "Value",
            ]}
          />
          <Radar
            dataKey="score"
            stroke="hsl(25 95% 53%)"
            fill="hsl(25 95% 53%)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

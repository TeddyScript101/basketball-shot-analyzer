"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from "recharts";
import type { MetricAverage } from "@/types";

interface Props {
  data: MetricAverage[];
}

function normalizeMetric(value: number, min: number | null, max: number | null): number {
  if (min === null || max === null) return 50;
  const range = max - min;
  if (range === 0) return 100;
  const center = (min + max) / 2;
  const distance = Math.abs(value - center);
  const maxDist = range * 1.5;
  return Math.max(0, Math.round(100 - (distance / maxDist) * 100));
}

const LABEL_TRUNCATE: Record<string, string> = {
  "Release Angle": "Release",
  "Elbow Angle at Release": "Elbow",
  "Knee Bend at Setup": "Knee",
  "Shoulder Alignment": "Shoulder",
  "Shot Duration": "Duration",
  "Jump Height Estimate": "Jump",
  "Release Consistency": "Consistency",
};

export function MetricsTrendChart({ data }: Props) {
  if (!data.length) return null;

  const radarData = data.map((m) => ({
    metric: LABEL_TRUNCATE[m.metric_name] ?? m.metric_name,
    score: normalizeMetric(m.average_value, m.ideal_min, m.ideal_max),
    raw: m.average_value,
    unit: m.metric_unit,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-semibold mb-1">Mechanics Radar</h3>
      <p className="text-sm text-muted-foreground mb-4">Average performance across all metrics</p>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="hsl(217 33% 16%)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fontSize: 11, fill: "hsl(215 20% 55%)" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 8%)",
              border: "1px solid hsl(217 33% 16%)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number, name: string, props) => [
              `${props.payload.raw} ${props.payload.unit ?? ""}`,
              "Value",
            ]}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(25 95% 53%)"
            fill="hsl(25 95% 53%)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

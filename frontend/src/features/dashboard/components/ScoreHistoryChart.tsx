"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import type { ScoreHistoryPoint } from "@/types";

interface Props {
  data: ScoreHistoryPoint[];
}

export function ScoreHistoryChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Score History</h3>
        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
          No data yet
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: format(new Date(d.date), "MMM d"),
    score: d.score,
    label: d.video_filename,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-semibold mb-1">Score History</h3>
      <p className="text-sm text-muted-foreground mb-4">Overall shooting score over time</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 16%)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(215 20% 55%)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "hsl(215 20% 55%)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 8%)",
              border: "1px solid hsl(217 33% 16%)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "hsl(210 40% 96%)" }}
          />
          <ReferenceLine y={70} stroke="hsl(25 95% 53% / 0.3)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(25 95% 53%)"
            strokeWidth={2.5}
            dot={{ fill: "hsl(25 95% 53%)", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

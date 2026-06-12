"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, ArrowRight } from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { StatsCards } from "@/features/dashboard/components/StatsCards";
import { ScoreHistoryChart } from "@/features/dashboard/components/ScoreHistoryChart";
import { MetricsTrendChart } from "@/features/dashboard/components/MetricsTrendChart";
import { cn, scoreToColor } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-card border border-border rounded-xl" />
          <div className="h-64 bg-card border border-border rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Failed to load dashboard. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data.stats.total_analyses === 0
              ? "Upload your first video to get started"
              : `${data.stats.total_analyses} session${data.stats.total_analyses !== 1 ? "s" : ""} analyzed`}
          </p>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Analysis
        </Link>
      </div>

      <StatsCards stats={data.stats} />

      {data.stats.total_analyses === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center space-y-4">
          <span className="text-5xl">🏀</span>
          <h2 className="text-xl font-semibold">No sessions yet</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Upload a shooting video to get your biomechanical breakdown and start tracking
            your improvement.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-lg font-semibold transition-colors text-sm"
          >
            Upload First Video
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScoreHistoryChart data={data.score_history} />
            <MetricsTrendChart data={data.metric_averages} />
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Analyses</h3>
              <Link href="/history" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {data.recent_analyses.map((item) => (
                <Link
                  key={item.id}
                  href={`/analysis/${item.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-sm">🏀</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-xs">
                        {item.video_filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.score != null && (
                      <span className={cn("text-lg font-bold tabular-nums", scoreToColor(item.score))}>
                        {item.score}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

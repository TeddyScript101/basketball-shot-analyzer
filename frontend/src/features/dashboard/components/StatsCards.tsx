import { TrendingUp, TrendingDown, Target, Activity, Award, BarChart3 } from "lucide-react";
import type { DashboardStats } from "@/types";
import { cn, scoreToColor } from "@/lib/utils";

interface Props {
  stats: DashboardStats;
}

export function StatsCards({ stats }: Props) {
  const cards = [
    {
      label: "Total Analyses",
      value: stats.total_analyses.toString(),
      icon: Activity,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Average Score",
      value: stats.average_score != null ? `${stats.average_score}` : "—",
      icon: BarChart3,
      color: stats.average_score != null ? scoreToColor(stats.average_score) : "text-muted-foreground",
      bg: "bg-primary/10",
    },
    {
      label: "Best Score",
      value: stats.best_score != null ? `${stats.best_score}` : "—",
      icon: Award,
      color: stats.best_score != null ? scoreToColor(stats.best_score) : "text-muted-foreground",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Improvement",
      value:
        stats.improvement_delta != null
          ? `${stats.improvement_delta > 0 ? "+" : ""}${stats.improvement_delta}`
          : "—",
      icon: stats.improvement_delta != null && stats.improvement_delta >= 0 ? TrendingUp : TrendingDown,
      color:
        stats.improvement_delta == null
          ? "text-muted-foreground"
          : stats.improvement_delta >= 0
          ? "text-emerald-400"
          : "text-red-400",
      bg:
        stats.improvement_delta == null
          ? "bg-muted/10"
          : stats.improvement_delta >= 0
          ? "bg-emerald-400/10"
          : "bg-red-400/10",
      suffix: stats.improvement_delta != null ? " pts" : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", card.bg)}>
              <card.icon className={cn("w-4 h-4", card.color)} />
            </div>
          </div>
          <p className={cn("text-3xl font-bold tabular-nums", card.color)}>
            {card.value}
            {card.suffix && <span className="text-lg font-medium">{card.suffix}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

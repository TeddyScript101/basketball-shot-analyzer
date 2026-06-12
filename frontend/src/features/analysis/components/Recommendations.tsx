import { AlertTriangle, Info, CheckCircle } from "lucide-react";
import type { Recommendation } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  recommendations: Recommendation[];
}

const PRIORITY_CONFIG = {
  1: {
    icon: AlertTriangle,
    label: "High Priority",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  2: {
    icon: Info,
    label: "Suggestion",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  3: {
    icon: CheckCircle,
    label: "Note",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
};

export function Recommendations({ recommendations }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-semibold">Coach Feedback</h3>
      <div className="space-y-3">
        {recommendations.map((rec) => {
          const cfg = PRIORITY_CONFIG[rec.priority as 1 | 2 | 3] ?? PRIORITY_CONFIG[3];
          const Icon = cfg.icon;
          return (
            <div
              key={rec.id}
              className={cn(
                "flex items-start gap-3 rounded-lg p-4 border",
                cfg.bg,
                cfg.border
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", cfg.color)} />
              <p className="text-sm leading-relaxed">{rec.recommendation_text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

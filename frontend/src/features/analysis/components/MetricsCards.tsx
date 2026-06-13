import { cn, metricInRange } from "@/lib/utils";
import type { Metric } from "@/types";
import { CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  metrics: Metric[];
}

export function MetricsCards({ metrics }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((m) => {
        const inRange = m.metric_value != null
          ? metricInRange(m.metric_value, m.ideal_min, m.ideal_max)
          : null;

        return (
          <div
            key={m.id}
            className={cn(
              "bg-card border rounded-xl p-4 space-y-2",
              inRange === true
                ? "border-emerald-500/30"
                : inRange === false
                ? "border-amber-500/30"
                : "border-border"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-muted-foreground leading-snug">{m.metric_name}</p>
              {inRange !== null && (
                inRange ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                )
              )}
            </div>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                inRange === true
                  ? "text-emerald-400"
                  : inRange === false
                  ? "text-amber-400"
                  : "text-foreground"
              )}
            >
              {m.metric_value != null
                ? m.metric_value < 1 ? m.metric_value.toFixed(2) : m.metric_value.toFixed(1)
                : "—"}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {m.metric_unit}
              </span>
            </p>
            {m.ideal_min != null && m.ideal_max != null && (
              <p className="text-xs text-muted-foreground">
                Ideal: {m.ideal_min != null && m.ideal_min < 1 ? m.ideal_min.toFixed(2) : m.ideal_min}–{m.ideal_max != null && m.ideal_max < 1 ? m.ideal_max.toFixed(2) : m.ideal_max} {m.metric_unit}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { cn, scoreToColor, scoreToGrade } from "@/lib/utils";

interface Props {
  score: number;
  shootingArm?: string | null;
  framesAnalyzed?: number | null;
  processingTime?: number | null;
}

export function ScoreBreakdown({ score, shootingArm, framesAnalyzed, processingTime }: Props) {
  const grade = scoreToGrade(score);
  const color = scoreToColor(score);

  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-semibold mb-5">Overall Score</h3>
      <div className="flex items-center gap-8">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(217 33% 16%)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-bold tabular-nums", color)}>
              {score.toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <span className={cn("text-4xl font-bold", color)}>{grade}</span>
            <p className="text-sm text-muted-foreground mt-0.5">
              {score >= 80 ? "Excellent form" : score >= 60 ? "Good with room to improve" : "Focus on fundamentals"}
            </p>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {shootingArm && (
              <p>
                Shooting arm:{" "}
                <span className="text-foreground capitalize">{shootingArm}</span>
              </p>
            )}
            {framesAnalyzed && (
              <p>
                Frames analyzed:{" "}
                <span className="text-foreground">{framesAnalyzed}</span>
              </p>
            )}
            {processingTime && (
              <p>
                Processed in:{" "}
                <span className="text-foreground">{processingTime.toFixed(1)}s</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

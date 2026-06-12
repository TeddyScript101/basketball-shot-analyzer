"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Search, Loader2 } from "lucide-react";
import { analysisApi } from "@/lib/api";
import { cn, scoreToColor } from "@/lib/utils";

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["analyses"],
    queryFn: analysisApi.list,
  });

  const filtered = data?.filter((a) => {
    const matchSearch =
      !search || a.video_filename?.toLowerCase().includes(search.toLowerCase());
    const matchMin = !minScore || (a.score != null && a.score >= Number(minScore));
    const matchMax = !maxScore || (a.score != null && a.score <= Number(maxScore));
    return matchSearch && matchMin && matchMax;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Shot History</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All your analyzed sessions
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename..."
            className="w-full bg-input border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            placeholder="Min score"
            className="w-24 bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <input
            type="number"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            placeholder="Max score"
            className="w-24 bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !filtered?.length ? (
        <div className="text-center py-20 space-y-3">
          <p className="text-4xl">📭</p>
          <p className="text-muted-foreground">
            {data?.length ? "No results match your filters." : "No analyses yet."}
          </p>
          {!data?.length && (
            <Link href="/upload" className="text-primary hover:underline text-sm">
              Upload your first video
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/analysis/${item.id}`}
              className="flex items-center justify-between p-4 hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🏀</span>
                </div>
                <div>
                  <p className="font-medium text-sm truncate max-w-xs">
                    {item.video_filename ?? `Analysis #${item.id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {item.score != null ? (
                  <div className="text-right">
                    <span className={cn("text-2xl font-bold tabular-nums", scoreToColor(item.score))}>
                      {item.score.toFixed(0)}
                    </span>
                    <p className="text-xs text-muted-foreground">/ 100</p>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Processing...</span>
                )}
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats, JobMatch, TrackedJob } from "@/types";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function JobRow({
  title,
  subtitle,
  badge,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3 text-left transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {badge}
    </button>
  );
}

export function DashboardPage({
  stats,
  trackedJobs,
  jobs,
  loading,
  clearingRecent,
  onClearRecent,
  onSelectJob,
}: {
  stats: DashboardStats | null;
  trackedJobs: TrackedJob[];
  jobs: JobMatch[];
  loading: boolean;
  clearingRecent: boolean;
  onClearRecent: () => void;
  onSelectJob: (jobId: string, source?: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle>Your job search dashboard</CardTitle>
          <CardDescription>Track saved, applied, and skipped roles. Telegram sends new matches hourly.</CardDescription>
        </CardHeader>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Saved" value={stats?.total_saved ?? 0} />
        <StatCard label="Applied" value={stats?.total_applied ?? 0} />
        <StatCard label="Skipped" value={stats?.total_skipped ?? 0} />
        <StatCard label="Avg Score" value={(stats?.average_saved_score ?? 0).toFixed(1)} />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{trackedJobs.length} tracked</Badge>
            {(stats?.recent_activity.length ?? 0) > 0 ? (
              <Button disabled={clearingRecent} size="sm" type="button" variant="outline" onClick={() => void onClearRecent()}>
                Clear
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(stats?.recent_activity ?? []).map((item) => (
            <JobRow
              key={`${item.source}-${item.source_job_id}`}
              title={item.job.title}
              subtitle={item.job.company_name ?? "Unknown company"}
              badge={
                <Badge variant={item.status === "applied" ? "success" : item.status === "skipped" ? "warning" : "default"}>
                  {item.status}
                </Badge>
              }
              onClick={() => onSelectJob(item.source_job_id, item.source)}
            />
          ))}
          {!stats?.recent_activity.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No tracked jobs yet.</p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Top Matches</CardTitle>
          <Badge variant="outline">{jobs.length} available</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobs.slice(0, 5).map((match) => (
            <JobRow
              key={match.job.source_job_id}
              title={match.job.title}
              subtitle={match.job.company_name ?? "Unknown company"}
              badge={<Badge>{match.score}</Badge>}
              onClick={() => onSelectJob(match.job.source_job_id, match.job.source)}
            />
          ))}
          {!jobs.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Upload resume and set preferences to see matches.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

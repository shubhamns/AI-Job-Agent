import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { trackingStatusLabel, trackingStatusVariant } from "@/lib/tracking";
import type { DashboardStats, JobMatch, TrackedJob } from "@/types";

const statMeta = [
  { key: "saved", label: "Saved", icon: Target, tone: "from-teal-500/15 to-teal-500/5 text-teal-700" },
  { key: "applied", label: "Applied", icon: Briefcase, tone: "from-cyan-500/15 to-cyan-500/5 text-cyan-700" },
  { key: "interview", label: "Interviews", icon: TrendingUp, tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-700" },
  { key: "offer", label: "Offers", icon: Sparkles, tone: "from-sky-500/15 to-sky-500/5 text-sky-700" },
] as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Target;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`bg-gradient-to-br ${tone} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
            </div>
            <div className="rounded-xl bg-white/70 p-2.5 shadow-sm">
              <Icon className="size-5" />
            </div>
          </div>
        </div>
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
      className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-white/70 p-4 text-left transition-all hover:border-primary/25 hover:bg-white hover:shadow-md hover:shadow-primary/5"
      onClick={onClick}
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        <ArrowUpRight className="size-4 text-muted-foreground/0 transition-all group-hover:text-primary" />
      </div>
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
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const statValues = {
    saved: stats?.total_saved ?? 0,
    applied: stats?.total_applied ?? 0,
    interview: stats?.total_interview ?? 0,
    offer: stats?.total_offer ?? 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good to see you back"
        description="Your pipeline, follow-ups, and best matches — all in one calm workspace."
      />

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700 text-white shadow-xl shadow-teal-500/20">
        <CardContent className="relative p-6 md:p-8">
          <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Badge className="border-0 bg-white/15 text-white ring-0">Pipeline snapshot</Badge>
              <h2 className="text-2xl font-bold md:text-3xl">
                {(stats?.interview_rate ?? 0).toFixed(0)}% interview rate
              </h2>
              <p className="max-w-md text-sm text-white/80">
                {stats?.total_tracked ?? 0} roles tracked · avg match score{" "}
                {(stats?.average_saved_score ?? 0).toFixed(0)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:min-w-[240px]">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs text-white/70">Rejected</p>
                <p className="text-2xl font-bold">{stats?.total_rejected ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs text-white/70">No response</p>
                <p className="text-2xl font-bold">{stats?.total_no_response ?? 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statMeta.map(({ key, label, icon, tone }) => (
          <StatCard key={key} label={label} value={statValues[key]} icon={icon} tone={tone} />
        ))}
      </div>

      {(stats?.upcoming_follow_ups.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="size-5 text-primary" />
              <CardTitle>Upcoming follow-ups</CardTitle>
            </div>
            <CardDescription>Stay on top of the roles that need your attention next.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats?.upcoming_follow_ups.map((item) => (
              <JobRow
                key={`${item.source}-${item.source_job_id}`}
                title={item.job.title}
                subtitle={item.follow_up_at ? new Date(item.follow_up_at).toLocaleDateString() : "No date"}
                badge={<Badge variant="outline">{trackingStatusLabel(item.status)}</Badge>}
                onClick={() => onSelectJob(item.source_job_id, item.source)}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription className="mt-1">Latest moves across your pipeline</CardDescription>
            </div>
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
                  <Badge variant={trackingStatusVariant(item.status)}>
                    {trackingStatusLabel(item.status)}
                  </Badge>
                }
                onClick={() => onSelectJob(item.source_job_id, item.source)}
              />
            ))}
            {!stats?.recent_activity.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No tracked jobs yet — save your first match.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Top matches</CardTitle>
              <CardDescription className="mt-1">Highest-scoring roles for your profile</CardDescription>
            </div>
            <Badge variant="outline">{jobs.length} available</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobs.slice(0, 5).map((match) => (
              <JobRow
                key={match.job.source_job_id}
                title={match.job.title}
                subtitle={match.job.company_name ?? "Unknown company"}
                badge={
                  <div className="flex gap-1">
                    <Badge>{match.score}</Badge>
                    {match.ai_fit ? <Badge variant="secondary">AI {match.ai_fit.score}</Badge> : null}
                  </div>
                }
                onClick={() => onSelectJob(match.job.source_job_id, match.job.source)}
              />
            ))}
            {!jobs.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Upload your resume to unlock personalized matches.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

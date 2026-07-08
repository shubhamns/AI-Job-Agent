import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PIPELINE_STATUSES } from "@/lib/constants";
import { formatSalary } from "@/lib/format";
import { trackingStatusLabel, trackingStatusVariant } from "@/lib/tracking";
import type { PipelineStatus, TrackedJob } from "@/types";

function TrackerCard({
  item,
  updating,
  onUpdate,
}: {
  item: TrackedJob;
  updating: boolean;
  onUpdate: (payload: {
    status?: PipelineStatus;
    notes?: string | null;
    follow_up_at?: string | null;
  }) => Promise<void>;
}) {
  const followUpValue = item.follow_up_at ? item.follow_up_at.slice(0, 10) : "";
  return (
    <Card className="border-border/80">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{item.job.title}</CardTitle>
            <CardDescription>{item.job.company_name ?? "Unknown company"}</CardDescription>
          </div>
          <Badge variant={trackingStatusVariant(item.status)}>{trackingStatusLabel(item.status)}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{formatSalary(item.job.salary_min, item.job.salary_max, item.job.salary_currency)}</Badge>
          {item.score !== null ? <Badge>{item.score}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Pipeline status</Label>
          <select
            className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
            value={item.status}
            disabled={updating}
            onChange={(event) => void onUpdate({ status: event.target.value as PipelineStatus })}
          >
            {PIPELINE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {trackingStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`notes-${item.source_job_id}`}>Notes</Label>
          <Textarea
            id={`notes-${item.source_job_id}`}
            defaultValue={item.notes ?? ""}
            placeholder="Recruiter feedback, next steps..."
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next !== (item.notes ?? "")) {
                void onUpdate({ notes: next || null });
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`follow-${item.source_job_id}`}>Follow-up date</Label>
          <input
            id={`follow-${item.source_job_id}`}
            type="date"
            className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
            defaultValue={followUpValue}
            onBlur={(event) => {
              const value = event.target.value;
              const next = value ? `${value}T09:00:00Z` : null;
              const current = item.follow_up_at ? item.follow_up_at.slice(0, 10) : "";
              if (value !== current) {
                void onUpdate({ follow_up_at: next });
              }
            }}
          />
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={item.job.redirect_url} rel="noreferrer" target="_blank">
            Open listing
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

export function TrackerPage({
  items,
  loading,
  updating,
  onUpdate,
  onMarkApplied,
}: {
  items: TrackedJob[];
  loading: boolean;
  updating: boolean;
  onUpdate: (
    source: string,
    sourceJobId: string,
    payload: { status?: PipelineStatus; notes?: string | null; follow_up_at?: string | null },
  ) => Promise<void>;
  onMarkApplied: (item: TrackedJob) => Promise<void>;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  const saved = items.filter((item) => item.status === "saved");
  const pipeline = items.filter((item) => PIPELINE_STATUSES.includes(item.status as PipelineStatus));
  return (
    <div className="space-y-4">
      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle>Application tracker</CardTitle>
          <CardDescription>
            Move applications through Applied, Interview, Rejected, Offer, or No Response. Add notes and follow-up dates.
          </CardDescription>
        </CardHeader>
      </Card>
      {saved.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved — ready to apply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {saved.map((item) => (
              <div key={`${item.source}-${item.source_job_id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.job.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{item.job.company_name ?? "Unknown company"}</p>
                </div>
                <Button size="sm" disabled={updating} onClick={() => void onMarkApplied(item)}>
                  Mark applied
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {pipeline.map((item) => (
          <TrackerCard
            key={`${item.source}-${item.source_job_id}`}
            item={item}
            updating={updating}
            onUpdate={(payload) => onUpdate(item.source, item.source_job_id, payload)}
          />
        ))}
      </div>
      {!pipeline.length && !saved.length ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No applications yet. Save jobs from the Jobs page and mark them as Applied to start tracking.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

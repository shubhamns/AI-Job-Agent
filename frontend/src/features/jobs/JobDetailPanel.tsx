import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSalary } from "@/lib/format";
import { trackingStatusLabel } from "@/lib/tracking";
import type { ApplicationPack, JobMatch, TrackedJob } from "@/types";

function ScoreBar({ label, value, max = 30 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="gradient-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ApplicationPackPanel({
  pack,
  loading,
  onGenerate,
}: {
  pack: ApplicationPack | null;
  loading: boolean;
  onGenerate: (refresh: boolean) => void;
}) {
  if (loading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (!pack) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/5 p-5 text-center">
        <Sparkles className="mx-auto mb-2 size-5 text-primary" />
        <p className="text-sm text-muted-foreground">Track this job first, then generate a tailored application pack.</p>
      </div>
    );
  }
  return (
    <Card className="overflow-hidden border-primary/15">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-violet-500/5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Application pack</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{pack.pack_source}</Badge>
            <Button size="sm" variant="outline" onClick={() => onGenerate(true)}>
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div>
          <p className="mb-2 text-sm font-semibold">CV suggestions</p>
          <ul className="space-y-2">
            {pack.cv_suggestions.map((item) => (
              <li key={item} className="flex gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Cover letter</p>
          <p className="whitespace-pre-wrap rounded-2xl bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
            {pack.cover_letter}
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Interview questions</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {pack.interview_questions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold">ATS keywords present</p>
            <div className="flex flex-wrap gap-2">
              {pack.ats_keywords_present.map((item) => (
                <Badge key={item} variant="success">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">ATS gaps</p>
            <div className="flex flex-wrap gap-2">
              {pack.ats_keywords_missing.map((item) => (
                <Badge key={item} variant="warning">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Verified claims</p>
          <div className="space-y-2">
            {pack.verified_claims.map((claim) => (
              <div
                key={claim.claim}
                className="flex items-start justify-between gap-2 rounded-xl border border-border bg-white/60 p-3 text-sm"
              >
                <span className="text-muted-foreground">{claim.claim}</span>
                <Badge variant={claim.verified ? "success" : "warning"}>
                  {claim.verified ? claim.source : "unverified"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function JobDetailPanel({
  job,
  trackedJobs,
  onTrackJob,
  onBack,
  showBack,
  pack,
  packLoading,
  onGeneratePack,
}: {
  job: JobMatch;
  trackedJobs: TrackedJob[];
  onTrackJob: (status: "saved" | "applied" | "skipped", match: JobMatch) => Promise<void>;
  onBack?: () => void;
  showBack?: boolean;
  pack: ApplicationPack | null;
  packLoading: boolean;
  onGeneratePack: (refresh: boolean) => void;
}) {
  const [showPack, setShowPack] = useState(false);
  const current = trackedJobs.find(
    (item) => item.source === job.job.source && item.source_job_id === job.job.source_job_id,
  );
  const currentStatus = current?.status;
  const isTracked = Boolean(current);

  return (
    <div className="space-y-4">
      {showBack && onBack ? (
        <Button variant="ghost" size="sm" className="w-fit gap-1 px-0" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to matches
        </Button>
      ) : null}

      <Card className="overflow-hidden border-0 shadow-xl shadow-teal-500/15">
        <div className="gradient-hero relative px-6 py-6 text-white md:px-8">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-white/15 text-white ring-0">{job.job.remote_type}</Badge>
                {currentStatus ? (
                  <Badge className="border-0 bg-white/20 text-white ring-0">
                    {trackingStatusLabel(currentStatus)}
                  </Badge>
                ) : null}
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-white md:text-3xl">{job.job.title}</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-1.5 text-white/80">
                  <Building2 className="size-4" />
                  {job.job.company_name ?? "Unknown company"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-white/75">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" />
                  {job.job.location_display ?? "Location TBD"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wallet className="size-4" />
                  {formatSalary(job.job.salary_min, job.job.salary_max, job.job.salary_currency)}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-3">
              <div className="rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-xs text-white/70">Match</p>
                <p className="text-3xl font-bold">{job.score}</p>
              </div>
              {job.ai_fit ? (
                <div className="rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur-sm">
                  <p className="flex items-center justify-center gap-1 text-xs text-white/70">
                    <Sparkles className="size-3" /> AI
                  </p>
                  <p className="text-3xl font-bold">{job.ai_fit.score}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {job.ai_fit ? (
          <div className="border-b border-border/50 bg-teal-500/5 px-6 py-4 md:px-8">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">AI rationale: </span>
              {job.ai_fit.rationale}
            </p>
          </div>
        ) : null}
      </Card>

      <div className="sticky bottom-20 z-10 flex flex-wrap gap-2 rounded-2xl border border-border bg-white/90 p-3 shadow-lg backdrop-blur-md lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <Button onClick={() => void onTrackJob("saved", job)}>Save</Button>
        <Button variant="secondary" onClick={() => void onTrackJob("applied", job)}>
          Applied
        </Button>
        <Button variant="outline" onClick={() => void onTrackJob("skipped", job)}>
          Skip
        </Button>
        {isTracked ? (
          <Button variant="outline" onClick={() => setShowPack((value) => !value)}>
            <Sparkles className="size-4" />
            {showPack ? "Hide pack" : "Application pack"}
          </Button>
        ) : null}
        <Button variant="ghost" asChild>
          <a href={job.job.redirect_url} rel="noreferrer" target="_blank">
            Open listing
            <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{job.job.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScoreBar label="Title fit" value={job.score_breakdown.title_points} />
            <ScoreBar label="Skills" value={job.score_breakdown.skill_points} />
            <ScoreBar label="Location" value={job.score_breakdown.location_points} />
            <ScoreBar label="Employment" value={job.score_breakdown.employment_type_points} />
            <ScoreBar label="Compensation" value={job.score_breakdown.compensation_points} />
            {job.score_breakdown.preferred_exclusion_penalty > 0 ? (
              <p className="text-xs text-warning">
                Exclusion penalty: -{job.score_breakdown.preferred_exclusion_penalty}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matched skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {job.matched_skills.map((skill) => (
                <Badge key={skill} variant="success">
                  {skill}
                </Badge>
              ))}
              {!job.matched_skills.length ? (
                <span className="text-sm text-muted-foreground">No direct skill matches.</span>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exclusion warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {job.preferred_excluded_technologies_found.map((tech) => (
                <Badge key={tech} variant="warning">
                  {tech}
                </Badge>
              ))}
              {!job.preferred_excluded_technologies_found.length ? (
                <span className="text-sm text-muted-foreground">No exclusion conflicts found.</span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {showPack ? <ApplicationPackPanel pack={pack} loading={packLoading} onGenerate={onGeneratePack} /> : null}
    </div>
  );
}

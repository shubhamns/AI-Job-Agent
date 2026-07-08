import { useState } from "react";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSalary } from "@/lib/format";
import { trackingStatusLabel, trackingStatusVariant } from "@/lib/tracking";
import type { ApplicationPack, JobMatch, TrackedJob } from "@/types";

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
    return <Skeleton className="h-40 w-full" />;
  }
  if (!pack) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4">
        <p className="text-sm text-muted-foreground">Track this job first, then generate a tailored application pack.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded-xl border border-border/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Application pack</p>
        <div className="flex gap-2">
          <Badge variant="outline">{pack.pack_source}</Badge>
          <Button size="sm" variant="outline" onClick={() => onGenerate(true)}>
            Refresh
          </Button>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">CV suggestions</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {pack.cv_suggestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Cover letter</p>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{pack.cover_letter}</p>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Interview questions</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {pack.interview_questions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium">ATS keywords present</p>
          <div className="flex flex-wrap gap-2">
            {pack.ats_keywords_present.map((item) => (
              <Badge key={item} variant="success">{item}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">ATS gaps</p>
          <div className="flex flex-wrap gap-2">
            {pack.ats_keywords_missing.map((item) => (
              <Badge key={item} variant="warning">{item}</Badge>
            ))}
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Verified claims</p>
        <div className="space-y-2">
          {pack.verified_claims.map((claim) => (
            <div key={claim.claim} className="flex items-start justify-between gap-2 rounded-lg border border-border/70 p-2 text-sm">
              <span className="text-muted-foreground">{claim.claim}</span>
              <Badge variant={claim.verified ? "success" : "warning"}>
                {claim.verified ? claim.source : "unverified"}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
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
    <Card className="border-border/80">
      <CardHeader className="space-y-3">
        {showBack && onBack ? (
          <Button variant="ghost" size="sm" className="w-fit px-0" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back to list
          </Button>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-xl">{job.job.title}</CardTitle>
            <CardDescription>{job.job.company_name ?? "Unknown company"}</CardDescription>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge className="text-sm">Score {job.score}</Badge>
            {job.ai_fit ? (
              <Badge variant="secondary">
                AI {job.ai_fit.score}
                <span className="ml-1 text-[10px] opacity-70">({job.ai_fit.score_source})</span>
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{job.job.remote_type}</Badge>
          <Badge variant="outline">{job.job.employment_type ?? "unknown"}</Badge>
          <Badge variant="outline">
            {formatSalary(job.job.salary_min, job.job.salary_max, job.job.salary_currency)}
          </Badge>
          {currentStatus ? (
            <Badge variant={trackingStatusVariant(currentStatus)}>
              {trackingStatusLabel(currentStatus)}
            </Badge>
          ) : null}
        </div>
        {job.ai_fit ? (
          <p className="text-sm text-muted-foreground">{job.ai_fit.rationale}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 pb-28 lg:pb-6">
        <p className="text-sm leading-relaxed text-muted-foreground">{job.job.description}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Matched Skills</p>
            <div className="flex flex-wrap gap-2">
              {job.matched_skills.map((skill) => (
                <Badge key={skill} variant="success">
                  {skill}
                </Badge>
              ))}
              {!job.matched_skills.length ? <span className="text-sm text-muted-foreground">No direct matches.</span> : null}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Exclusion Warnings</p>
            <div className="flex flex-wrap gap-2">
              {job.preferred_excluded_technologies_found.map((tech) => (
                <Badge key={tech} variant="warning">
                  {tech}
                </Badge>
              ))}
              {!job.preferred_excluded_technologies_found.length ? (
                <span className="text-sm text-muted-foreground">None found.</span>
              ) : null}
            </div>
          </div>
        </div>
        {showPack ? (
          <ApplicationPackPanel pack={pack} loading={packLoading} onGenerate={onGeneratePack} />
        ) : null}
        <div className="sticky bottom-20 z-10 flex flex-wrap gap-2 rounded-xl border border-border/80 bg-card/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
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
      </CardContent>
    </Card>
  );
}

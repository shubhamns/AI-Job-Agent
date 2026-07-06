import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSalary } from "@/lib/format";
import type { JobMatch, TrackedJob } from "@/types";

export function JobDetailPanel({
  job,
  trackedJobs,
  onTrackJob,
  onBack,
  showBack,
}: {
  job: JobMatch;
  trackedJobs: TrackedJob[];
  onTrackJob: (status: "saved" | "applied" | "skipped", match: JobMatch) => Promise<void>;
  onBack?: () => void;
  showBack?: boolean;
}) {
  const currentStatus = trackedJobs.find(
    (item) => item.source === job.job.source && item.source_job_id === job.job.source_job_id,
  )?.status;
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
          <Badge className="shrink-0 text-sm">{job.score}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{job.job.remote_type}</Badge>
          <Badge variant="outline">{job.job.employment_type ?? "unknown"}</Badge>
          <Badge variant="outline">
            {formatSalary(job.job.salary_min, job.job.salary_max, job.job.salary_currency)}
          </Badge>
          {currentStatus ? (
            <Badge variant={currentStatus === "applied" ? "success" : currentStatus === "skipped" ? "warning" : "default"}>
              {currentStatus}
            </Badge>
          ) : null}
        </div>
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
        <div className="sticky bottom-20 z-10 flex flex-wrap gap-2 rounded-xl border border-border/80 bg-card/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <Button onClick={() => void onTrackJob("saved", job)}>Save</Button>
          <Button variant="secondary" onClick={() => void onTrackJob("applied", job)}>
            Applied
          </Button>
          <Button variant="outline" onClick={() => void onTrackJob("skipped", job)}>
            Skip
          </Button>
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

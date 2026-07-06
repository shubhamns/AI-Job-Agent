import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { JobDetailPanel } from "@/features/jobs/JobDetailPanel";
import { JobListItem } from "@/features/jobs/JobListItem";
import type { JobMatch, TrackedJob } from "@/types";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 1023px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const handler = () => setIsMobile(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function JobsPage({
  jobs,
  trackedJobs,
  filters,
  jobsLoading,
  jobsError,
  selectedJob,
  autoOpenJobId,
  onAutoOpenHandled,
  onFiltersChange,
  onResetFilters,
  onSelectJob,
  onTrackJob,
}: {
  jobs: JobMatch[];
  trackedJobs: TrackedJob[];
  filters: {
    search: string;
    sortBy: "score" | "recent" | "salary";
    minScore: number;
    includeSkipped: boolean;
    remoteTypes: string;
  };
  jobsLoading: boolean;
  jobsError: string | null;
  selectedJob: JobMatch | null;
  autoOpenJobId: string | null;
  onAutoOpenHandled: () => void;
  onFiltersChange: (filters: {
    search: string;
    sortBy: "score" | "recent" | "salary";
    minScore: number;
    includeSkipped: boolean;
    remoteTypes: string;
  }) => void;
  onResetFilters: () => void;
  onSelectJob: (jobId: string) => void;
  onTrackJob: (status: "saved" | "applied" | "skipped", match: JobMatch) => Promise<void>;
}) {
  const isMobile = useIsMobile();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  useEffect(() => {
    if (!autoOpenJobId || !selectedJob || selectedJob.job.source_job_id !== autoOpenJobId) {
      return;
    }
    if (isMobile) {
      setMobileDetailOpen(true);
    }
    onAutoOpenHandled();
  }, [autoOpenJobId, selectedJob, isMobile, onAutoOpenHandled]);
  useEffect(() => {
    if (!isMobile) {
      setMobileDetailOpen(false);
    }
  }, [isMobile]);
  function handleSelectJob(jobId: string) {
    onSelectJob(jobId);
    if (isMobile) {
      setMobileDetailOpen(true);
    }
  }
  if (isMobile && mobileDetailOpen && selectedJob) {
    return (
      <div className="space-y-4">
        {jobsError ? <p className="text-sm text-destructive">{jobsError}</p> : null}
        <JobDetailPanel
          job={selectedJob}
          trackedJobs={trackedJobs}
          onTrackJob={onTrackJob}
          onBack={() => setMobileDetailOpen(false)}
          showBack
        />
      </div>
    );
  }
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[22rem_1fr] lg:gap-4">
      <Card className="h-fit border-border/80">
        <CardHeader>
          <CardTitle className="text-base">Find Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={filters.search}
              onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
              placeholder="React, Bangalore..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remoteTypes">Work style</Label>
            <Input
              id="remoteTypes"
              value={filters.remoteTypes}
              onChange={(event) => onFiltersChange({ ...filters, remoteTypes: event.target.value })}
              placeholder="remote, hybrid"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <Label>Sort by</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
                value={filters.sortBy}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    sortBy: event.target.value as "score" | "recent" | "salary",
                  })
                }
              >
                <option value="score">Best score</option>
                <option value="recent">Most recent</option>
                <option value="salary">Highest salary</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Min score: {filters.minScore}</Label>
              <input
                className="w-full accent-primary"
                type="range"
                min={0}
                max={100}
                value={filters.minScore}
                onChange={(event) => onFiltersChange({ ...filters, minScore: Number(event.target.value) })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              checked={filters.includeSkipped}
              onChange={(event) => onFiltersChange({ ...filters, includeSkipped: event.target.checked })}
              type="checkbox"
              className="accent-primary"
            />
            Include skipped jobs
          </label>
          {jobsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : null}
          <div className="space-y-2 lg:max-h-[60vh] lg:overflow-y-auto">
            {jobs.map((match) => (
              <JobListItem
                key={`${match.job.source}-${match.job.source_job_id}`}
                match={match}
                selected={selectedJob?.job.source_job_id === match.job.source_job_id}
                onClick={() => handleSelectJob(match.job.source_job_id)}
              />
            ))}
            {!jobsLoading && !jobs.length ? (
              <div className="space-y-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">No jobs match your current filters.</p>
                <p className="text-xs text-muted-foreground">
                  Try lowering min score, clearing search, or updating titles/locations in Preferences.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={onResetFilters}>
                  Reset filters
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <div className="hidden lg:block">
        {selectedJob ? (
          <JobDetailPanel job={selectedJob} trackedJobs={trackedJobs} onTrackJob={onTrackJob} />
        ) : (
          <Card className="flex min-h-[50vh] items-center justify-center border-dashed">
            <CardContent className="text-center">
              <p className="font-medium">Select a job</p>
              <p className="mt-1 text-sm text-muted-foreground">Pick a match to view details and track progress.</p>
            </CardContent>
          </Card>
        )}
      </div>
      {jobsError ? <p className="text-sm text-destructive lg:col-span-2">{jobsError}</p> : null}
    </div>
  );
}

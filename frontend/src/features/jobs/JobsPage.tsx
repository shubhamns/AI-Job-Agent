import { useEffect, useState } from "react";
import { Filter, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { JobDetailPanel } from "@/features/jobs/JobDetailPanel";
import { JobListEmpty, JobListItem } from "@/features/jobs/JobListItem";
import { cn } from "@/lib/utils";
import type { JobFilters } from "@/lib/constants";
import type { ApplicationPack, JobMatch, TrackedJob } from "@/types";

const sortOptions = [
  { value: "score", label: "Best score" },
  { value: "ai_score", label: "AI fit" },
  { value: "recent", label: "Recent" },
  { value: "salary", label: "Salary" },
] as const;

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

function FiltersBar({
  filters,
  onChange,
  onReset,
  compact = false,
}: {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  onReset: () => void;
  compact?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className={cn("p-4", compact ? "space-y-4" : "space-y-4 lg:space-y-0")}>
        <div className={cn("flex flex-col gap-4", !compact && "lg:flex-row lg:items-end lg:gap-3")}>
          <div className={cn("relative min-w-0", !compact && "lg:min-w-[220px] lg:flex-[1.4]")}>
            {!compact ? (
              <Label htmlFor="job-search" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Search
              </Label>
            ) : null}
            <Search className="absolute bottom-3 left-3.5 size-4 text-muted-foreground" />
            <Input
              id="job-search"
              className="pl-10"
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
              placeholder="Title, company, skills..."
            />
          </div>

          <div className={cn("min-w-0", !compact && "lg:min-w-[160px] lg:flex-1")}>
            {!compact ? (
              <Label htmlFor="remoteTypes" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Work style
              </Label>
            ) : null}
            <Input
              id="remoteTypes"
              value={filters.remoteTypes}
              onChange={(event) => onChange({ ...filters, remoteTypes: event.target.value })}
              placeholder="remote, hybrid"
            />
          </div>

          <div className={cn(!compact && "lg:min-w-[200px] lg:flex-[1.2]")}>
            {!compact ? (
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Min score · {filters.minScore}
              </Label>
            ) : null}
            <input
              className="h-11 w-full accent-primary"
              type="range"
              min={0}
              max={100}
              value={filters.minScore}
              onChange={(event) => onChange({ ...filters, minScore: Number(event.target.value) })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>
        </div>

        <div className={cn("flex flex-col gap-3 border-t border-border/50 pt-4", !compact && "lg:flex-row lg:items-center lg:justify-between")}>
          <div className="flex flex-wrap items-center gap-2">
            {!compact ? (
              <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <SlidersHorizontal className="size-3.5" />
                Sort
              </span>
            ) : null}
            {sortOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={filters.sortBy === option.value ? "default" : "outline"}
                onClick={() => onChange({ ...filters, sortBy: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-white/60 px-3 py-2 text-sm lg:shrink-0">
            <input
              checked={filters.includeSkipped}
              onChange={(event) => onChange({ ...filters, includeSkipped: event.target.checked })}
              type="checkbox"
              className="size-4 accent-primary"
            />
            <span className="text-muted-foreground">Include skipped</span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
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
  pack,
  packLoading,
  onGeneratePack,
}: {
  jobs: JobMatch[];
  trackedJobs: TrackedJob[];
  filters: JobFilters;
  jobsLoading: boolean;
  jobsError: string | null;
  selectedJob: JobMatch | null;
  autoOpenJobId: string | null;
  onAutoOpenHandled: () => void;
  onFiltersChange: (filters: JobFilters) => void;
  onResetFilters: () => void;
  onSelectJob: (jobId: string) => void;
  onTrackJob: (status: "saved" | "applied" | "skipped", match: JobMatch) => Promise<void>;
  pack: ApplicationPack | null;
  packLoading: boolean;
  onGeneratePack: (refresh: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
        {jobsError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {jobsError}
          </div>
        ) : null}
        <JobDetailPanel
          job={selectedJob}
          trackedJobs={trackedJobs}
          onTrackJob={onTrackJob}
          onBack={() => setMobileDetailOpen(false)}
          showBack
          pack={pack}
          packLoading={packLoading}
          onGeneratePack={onGeneratePack}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Discover jobs"
        description="Browse AI-scored matches, filter by fit, and track roles without leaving your workspace."
        action={
          <Badge variant="outline" className="px-3 py-1 text-sm">
            {jobsLoading ? "..." : `${jobs.length} matches`}
          </Badge>
        }
      />

      {jobsError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {jobsError}
        </div>
      ) : null}

      {/* Mobile: quick search + filter toggle */}
      <div className="flex gap-2 lg:hidden">
        <div className="relative flex-1">
          <Search className="absolute top-3 left-3.5 size-4 text-muted-foreground" />
          <Input
            className="pl-10"
            value={filters.search}
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
            placeholder="Search jobs..."
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters((value) => !value)}
          aria-label="Toggle filters"
        >
          <Filter className="size-4" />
        </Button>
      </div>

      {/* Full-width filters row */}
      <div className={cn(showFilters ? "block" : "hidden", "lg:block")}>
        <FiltersBar
          filters={filters}
          onChange={onFiltersChange}
          onReset={onResetFilters}
          compact={isMobile}
        />
      </div>

      {/* Jobs list + detail */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold">Matches</p>
            {!jobsLoading ? <span className="text-xs text-muted-foreground">{jobs.length} roles</span> : null}
          </div>
          <CardContent className="space-y-2 p-3">
            {jobsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)
            ) : jobs.length ? (
              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-20rem)]">
                {jobs.map((match) => (
                  <JobListItem
                    key={`${match.job.source}-${match.job.source_job_id}`}
                    match={match}
                    selected={selectedJob?.job.source_job_id === match.job.source_job_id}
                    onClick={() => handleSelectJob(match.job.source_job_id)}
                  />
                ))}
              </div>
            ) : (
              <JobListEmpty />
            )}
            {!jobsLoading && !jobs.length ? (
              <Button className="mt-3 w-full" variant="outline" size="sm" onClick={onResetFilters}>
                Reset filters
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <div className="min-w-0">
          {selectedJob ? (
            <JobDetailPanel
              job={selectedJob}
              trackedJobs={trackedJobs}
              onTrackJob={onTrackJob}
              pack={pack}
              packLoading={packLoading}
              onGeneratePack={onGeneratePack}
            />
          ) : (
            <Card className="flex min-h-[420px] items-center justify-center border-dashed border-primary/25 bg-gradient-to-br from-teal-500/10 via-transparent to-cyan-500/5">
              <CardContent className="max-w-sm text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/25">
                  <Search className="size-6 text-white" />
                </div>
                <p className="text-lg font-semibold">Select a job to explore</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick a match from the list to view the full description, AI rationale, and tracking actions.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

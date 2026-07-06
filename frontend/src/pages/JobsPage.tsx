import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { JobsPage as JobsView } from "@/features/jobs/JobsPage";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useJobMatches, useTrackJob, useTrackedJobs } from "@/hooks/queries";
import { defaultJobFilters } from "@/lib/constants";
import { resolveJobMatch } from "@/lib/jobs";
import type { JobMatch } from "@/types";

export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenJobId = searchParams.get("open");
  const openSource = searchParams.get("source");
  const [filters, setFilters] = useState(defaultJobFilters);
  const debouncedSearch = useDebouncedValue(filters.search);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(autoOpenJobId);
  const jobFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );
  const jobsQuery = useJobMatches(jobFilters);
  const trackedQuery = useTrackedJobs();
  const trackJob = useTrackJob();

  const handleAutoOpenHandled = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("open");
    next.delete("source");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (autoOpenJobId) {
      setSelectedJobId(autoOpenJobId);
    }
  }, [autoOpenJobId]);

  useEffect(() => {
    if (!autoOpenJobId || jobsQuery.isLoading || trackedQuery.isLoading) {
      return;
    }
    const jobs = jobsQuery.data?.items ?? [];
    const tracked = trackedQuery.data ?? [];
    const match = resolveJobMatch(jobs, tracked, autoOpenJobId, openSource);
    if (!match) {
      toast.error("This job is no longer available. Clear recent activity to remove old entries.");
      handleAutoOpenHandled();
    }
  }, [
    autoOpenJobId,
    openSource,
    jobsQuery.data,
    jobsQuery.isLoading,
    trackedQuery.data,
    trackedQuery.isLoading,
    handleAutoOpenHandled,
  ]);

  useEffect(() => {
    if (autoOpenJobId) {
      return;
    }
    const items = jobsQuery.data?.items ?? [];
    setSelectedJobId((current) => current ?? items[0]?.job.source_job_id ?? null);
  }, [jobsQuery.data, autoOpenJobId]);

  useEffect(() => {
    if (jobsQuery.isError) {
      const message = jobsQuery.error instanceof Error ? jobsQuery.error.message : "Unable to load jobs.";
      toast.error(message);
    }
  }, [jobsQuery.isError, jobsQuery.error]);

  const jobs = jobsQuery.data?.items ?? [];
  const trackedJobs = trackedQuery.data ?? [];
  const selectedJob = useMemo(
    () => resolveJobMatch(jobs, trackedJobs, selectedJobId, openSource),
    [jobs, trackedJobs, selectedJobId, openSource],
  );

  async function handleTrackJob(status: "saved" | "applied" | "skipped", match: JobMatch) {
    await toast.promise(
      trackJob.mutateAsync({ status, score: match.score, job: match.job }),
      {
        loading: "Updating job status...",
        success: `Marked as ${status}`,
        error: (error) => (error instanceof Error ? error.message : "Update failed"),
      },
    );
  }

  function handleResetFilters() {
    setFilters(defaultJobFilters);
  }

  return (
    <JobsView
      jobs={jobs}
      trackedJobs={trackedJobs}
      filters={filters}
      jobsLoading={jobsQuery.isLoading || jobsQuery.isFetching}
      jobsError={jobsQuery.isError ? (jobsQuery.error instanceof Error ? jobsQuery.error.message : "Unable to load jobs.") : null}
      selectedJob={selectedJob}
      autoOpenJobId={autoOpenJobId}
      onAutoOpenHandled={handleAutoOpenHandled}
      onFiltersChange={setFilters}
      onResetFilters={handleResetFilters}
      onSelectJob={setSelectedJobId}
      onTrackJob={handleTrackJob}
    />
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { JobsPage as JobsView } from "@/features/jobs/JobsPage";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useApplicationPack,
  useGenerateApplicationPack,
  useJobMatches,
  useTrackJob,
  useTrackedJobs,
} from "@/hooks/queries";
import { defaultJobFilters } from "@/lib/constants";
import { errorMessage } from "@/lib/errors";
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
  const generatePack = useGenerateApplicationPack();
  const jobs = jobsQuery.data?.items ?? [];
  const trackedJobs = trackedQuery.data ?? [];
  const selectedJob = useMemo(
    () => resolveJobMatch(jobs, trackedJobs, selectedJobId, openSource),
    [jobs, trackedJobs, selectedJobId, openSource],
  );
  const isTracked = Boolean(
    selectedJob &&
      trackedJobs.some(
        (item) =>
          item.source === selectedJob.job.source &&
          item.source_job_id === selectedJob.job.source_job_id,
      ),
  );
  const packQuery = useApplicationPack(
    selectedJob?.job.source ?? "",
    selectedJob?.job.source_job_id ?? "",
    isTracked,
  );

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
    const match = resolveJobMatch(jobs, trackedJobs, autoOpenJobId, openSource);
    if (!match) {
      toast.error("This job is no longer available. Clear recent activity to remove old entries.");
      handleAutoOpenHandled();
    }
  }, [
    autoOpenJobId,
    openSource,
    jobs,
    trackedJobs,
    jobsQuery.isLoading,
    trackedQuery.isLoading,
    handleAutoOpenHandled,
  ]);

  useEffect(() => {
    if (autoOpenJobId) {
      return;
    }
    setSelectedJobId((current) => current ?? jobs[0]?.job.source_job_id ?? null);
  }, [jobs, autoOpenJobId]);

  useEffect(() => {
    if (jobsQuery.isError) {
      const message = errorMessage(jobsQuery.error, "Unable to load jobs.");
      toast.error(message);
    }
  }, [jobsQuery.isError, jobsQuery.error]);

  async function handleTrackJob(status: "saved" | "applied" | "skipped", match: JobMatch) {
    await toast.promise(
      trackJob.mutateAsync({
        status,
        score: match.score,
        ai_score: match.ai_fit?.score ?? null,
        ai_score_rationale: match.ai_fit?.rationale ?? null,
        job: match.job,
      }),
      {
        loading: "Updating job status...",
        success: `Marked as ${status}`,
        error: (error) => errorMessage(error, "Update failed"),
      },
    );
  }

  function handleGeneratePack(refresh: boolean) {
    if (!selectedJob) return;
    void toast.promise(
      generatePack.mutateAsync({
        source: selectedJob.job.source,
        sourceJobId: selectedJob.job.source_job_id,
        refresh,
      }),
      {
        loading: refresh ? "Refreshing application pack..." : "Generating application pack...",
        success: "Application pack ready",
        error: (error) => errorMessage(error, "Generation failed"),
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
      jobsLoading={jobsQuery.isLoading}
      jobsError={jobsQuery.isError ? errorMessage(jobsQuery.error, "Unable to load jobs.") : null}
      selectedJob={selectedJob}
      autoOpenJobId={autoOpenJobId}
      onAutoOpenHandled={handleAutoOpenHandled}
      onFiltersChange={setFilters}
      onResetFilters={handleResetFilters}
      onSelectJob={setSelectedJobId}
      onTrackJob={handleTrackJob}
      pack={packQuery.data ?? generatePack.data ?? null}
      packLoading={packQuery.isLoading || generatePack.isPending}
      onGeneratePack={handleGeneratePack}
    />
  );
}

import type { JobMatch, TrackedJob } from "@/types";

function trackedJobToMatch(tracked: TrackedJob): JobMatch {
  return {
    dedupe_key: tracked.dedupe_key,
    score: tracked.score ?? 0,
    job: tracked.job,
    tracking_status: tracked.status,
    matched_skills: [],
    preferred_excluded_technologies_found: [],
    filter_decision: {
      passed: true,
      reasons: [],
      required_excluded_technologies_found: [],
    },
    score_breakdown: {
      title_points: 0,
      skill_points: 0,
      location_points: 0,
      employment_type_points: 0,
      compensation_points: 0,
      preferred_exclusion_penalty: 0,
    },
  };
}

export function resolveJobMatch(
  jobs: JobMatch[],
  trackedJobs: TrackedJob[],
  jobId: string | null,
  source: string | null,
): JobMatch | null {
  if (!jobId) {
    return null;
  }
  const live = jobs.find(
    (item) =>
      item.job.source_job_id === jobId && (!source || item.job.source === source),
  );
  if (live) {
    return live;
  }
  const tracked = trackedJobs.find(
    (item) => item.source_job_id === jobId && (!source || item.source === source),
  );
  return tracked ? trackedJobToMatch(tracked) : null;
}

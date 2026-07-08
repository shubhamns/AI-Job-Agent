import { toast } from "sonner";
import { TrackerPage as TrackerView } from "@/features/tracker/TrackerPage";
import { useTrackJob, useTrackedJobs, useUpdateTrackedJob } from "@/hooks/queries";
import { errorMessage } from "@/lib/errors";
import type { PipelineStatus, TrackedJob } from "@/types";

export function TrackerPage() {
  const trackedQuery = useTrackedJobs();
  const trackJob = useTrackJob();
  const updateTracked = useUpdateTrackedJob();
  const items = trackedQuery.data ?? [];
  async function handleUpdate(
    source: string,
    sourceJobId: string,
    payload: { status?: PipelineStatus; notes?: string | null; follow_up_at?: string | null },
  ) {
    await toast.promise(
      updateTracked.mutateAsync({ source, sourceJobId, ...payload }),
      {
        loading: "Updating application...",
        success: "Application updated",
        error: (error) => errorMessage(error, "Update failed"),
      },
    );
  }
  async function handleMarkApplied(item: TrackedJob) {
    await toast.promise(
      trackJob.mutateAsync({
        status: "applied",
        score: item.score ?? 0,
        ai_score: item.ai_score,
        ai_score_rationale: item.ai_score_rationale,
        job: item.job,
      }),
      {
        loading: "Marking as applied...",
        success: "Moved to application pipeline",
        error: (error) => errorMessage(error, "Update failed"),
      },
    );
  }
  return (
    <TrackerView
      items={items}
      loading={trackedQuery.isLoading}
      updating={trackJob.isPending || updateTracked.isPending}
      onUpdate={handleUpdate}
      onMarkApplied={handleMarkApplied}
    />
  );
}

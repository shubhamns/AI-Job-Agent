import { Briefcase, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trackingStatusLabel, trackingStatusVariant } from "@/lib/tracking";
import type { JobMatch } from "@/types";

function companyInitial(name: string | null) {
  return (name?.trim()?.[0] ?? "?").toUpperCase();
}

function scoreTone(score: number) {
  if (score >= 85) return "from-emerald-500 to-teal-500";
  if (score >= 70) return "from-teal-500 to-cyan-500";
  return "from-sky-500 to-blue-600";
}

export function JobListItem({
  match,
  selected,
  className,
  onClick,
}: {
  match: JobMatch;
  selected?: boolean;
  className?: string;
  onClick: () => void;
}) {
  const status = match.tracking_status;
  const isNew = status === "new";

  return (
    <button
      type="button"
      className={cn(
        "group relative flex w-full gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200",
        selected
          ? "border-primary/35 bg-gradient-to-r from-primary/12 via-cyan-500/8 to-transparent shadow-lg shadow-primary/15 ring-1 ring-primary/25"
          : "surface-hover hover:shadow-md hover:shadow-primary/10",
        className,
      )}
      onClick={onClick}
    >
      {selected ? (
        <span className="absolute inset-y-3 left-0 w-1 rounded-full gradient-primary" aria-hidden />
      ) : null}
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm",
          `bg-gradient-to-br ${scoreTone(match.score)}`,
        )}
      >
        {companyInitial(match.job.company_name)}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{match.job.title}</p>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{match.score}</span>
            {match.ai_fit ? (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-cyan-600">
                <Sparkles className="size-3" />
                {match.ai_fit.score}
              </span>
            ) : null}
          </div>
        </div>
        <p className="truncate text-xs font-medium text-muted-foreground">{match.job.company_name ?? "Unknown company"}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <MapPin className="size-3" />
            {match.job.location_display ?? "Remote"}
          </span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
            {match.job.remote_type}
          </Badge>
          {!isNew ? (
            <Badge variant={trackingStatusVariant(status)} className="h-5 px-1.5 text-[10px]">
              {trackingStatusLabel(status)}
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function JobListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-6 py-10 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
        <Briefcase className="size-6 text-primary" />
      </div>
      <p className="font-semibold">No matches found</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Try lowering the min score, clearing search, or updating preferences.
      </p>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobMatch } from "@/types";

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
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
        selected ? "border-primary/40 bg-primary/5" : "border-border/70 bg-background/60 hover:bg-accent/50",
        className,
      )}
      onClick={onClick}
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{match.job.title}</p>
        <p className="truncate text-sm text-muted-foreground">{match.job.company_name ?? "Unknown company"}</p>
        <p className="truncate text-xs text-muted-foreground">{match.job.location_display ?? "Location TBD"}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge>{match.score}</Badge>
        {match.ai_fit ? <Badge variant="secondary">AI {match.ai_fit.score}</Badge> : null}
        <Badge variant="outline">{match.tracking_status}</Badge>
      </div>
    </button>
  );
}

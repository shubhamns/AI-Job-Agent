import { Loader2, Sparkles } from "lucide-react";

export function PageLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="glass-panel flex flex-col items-center gap-4 rounded-3xl px-8 py-7">
        <div className="gradient-primary flex size-14 items-center justify-center rounded-2xl shadow-lg shadow-primary/30">
          <Loader2 className="size-7 animate-spin text-white" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

export function LandingNav({
  onDemoLogin,
  demoLoading,
}: {
  onDemoLogin?: () => void;
  demoLoading?: boolean;
}) {
  return (
    <header className="safe-top fixed inset-x-0 top-0 z-50 px-4 pt-3">
      <div className="glass-panel mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="gradient-primary flex size-9 items-center justify-center rounded-xl shadow-md shadow-primary/25">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">AI Job Agent</span>
        </Link>
        <nav className="flex items-center gap-2">
          {env.demoMode && onDemoLogin ? (
            <Button variant="outline" size="sm" disabled={demoLoading} onClick={onDemoLogin}>
              {demoLoading ? "Starting..." : "Try Demo"}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/login">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

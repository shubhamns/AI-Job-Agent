import { useStrategy } from "@/hooks/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StrategyPage() {
  const strategyQuery = useStrategy();
  const data = strategyQuery.data ?? null;
  const loading = strategyQuery.isLoading;
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  const evidence = data?.recommendations.filter((item) => item.kind === "evidence") ?? [];
  const suggestions = data?.recommendations.filter((item) => item.kind === "suggestion") ?? [];
  return (
    <div className="space-y-4">
      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle>Strategy agent</CardTitle>
          <CardDescription>
            Evidence-backed insights from your outcomes are separated from AI suggestions.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Badge variant="success">{data?.evidence_count ?? 0} evidence</Badge>
        <Badge variant="outline">{data?.suggestion_count ?? 0} AI suggestions</Badge>
        <Badge variant="secondary">{data?.llm_enabled ? "LLM enabled" : "Heuristic mode"}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evidence</CardTitle>
          <CardDescription>Derived from your tracked application outcomes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {evidence.map((item) => (
            <div key={item.title} className="rounded-xl border border-success/30 bg-success/5 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="success">Evidence</Badge>
                {item.metric ? <Badge variant="outline">{item.metric}</Badge> : null}
                {item.sample_size ? <Badge variant="outline">n={item.sample_size}</Badge> : null}
              </div>
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
            </div>
          ))}
          {!evidence.length ? (
            <p className="text-sm text-muted-foreground">
              Track at least 3 applications with interview outcomes to unlock evidence-based recommendations.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI suggestions</CardTitle>
          <CardDescription>Hypotheses to test — not proven by your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.map((item) => (
            <div key={item.title} className="rounded-xl border border-border/70 p-4">
              <div className="mb-2">
                <Badge variant="secondary">AI suggestion</Badge>
              </div>
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
            </div>
          ))}
          {!suggestions.length ? <p className="text-sm text-muted-foreground">No suggestions available.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

import { useOutcomeIntelligence } from "@/hooks/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { OutcomeBucket } from "@/types";

function BucketTable({ title, buckets }: { title: string; buckets: OutcomeBucket[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
            <div className="min-w-0">
              <p className="truncate font-medium capitalize">{bucket.label}</p>
              <p className="text-xs text-muted-foreground">
                {bucket.interviews} interviews · {bucket.offers} offers · {bucket.applied} applied
              </p>
            </div>
            <Badge variant="outline">{bucket.interview_rate}%</Badge>
          </div>
        ))}
        {!buckets.length ? <p className="text-sm text-muted-foreground">Not enough data yet.</p> : null}
      </CardContent>
    </Card>
  );
}

export function InsightsPage() {
  const outcomesQuery = useOutcomeIntelligence();
  const data = outcomesQuery.data ?? null;
  const loading = outcomesQuery.isLoading;
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle>Outcome intelligence</CardTitle>
          <CardDescription>
            Observed conversion rates from your tracked applications — not AI guesses.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Applications</p><p className="text-2xl font-semibold">{data?.total_applications ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Interviews</p><p className="text-2xl font-semibold">{data?.total_interviews ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Offers</p><p className="text-2xl font-semibold">{data?.total_offers ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Interview rate</p><p className="text-2xl font-semibold">{(data?.overall_interview_rate ?? 0).toFixed(1)}%</p></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BucketTable title="By role type" buckets={data?.by_role_type ?? []} />
        <BucketTable title="By skill signal" buckets={data?.by_skill ?? []} />
        <BucketTable title="By location" buckets={data?.by_location ?? []} />
        <BucketTable title="By salary band" buckets={data?.by_salary_band ?? []} />
        <BucketTable title="By job source" buckets={data?.by_source ?? []} />
      </div>
    </div>
  );
}

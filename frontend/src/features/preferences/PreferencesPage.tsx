import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { JobPreference } from "@/types";

export function PreferencesPage({
  preferences,
  defaultValues,
  saving,
  loading,
  onSave,
}: {
  preferences: JobPreference | null;
  defaultValues: Record<string, string>;
  saving: boolean;
  loading: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  if (loading) {
    return <Skeleton className="h-[32rem] w-full" />;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Preferences</CardTitle>
        <CardDescription>Tailor matching for roles across India — titles, locations, and filters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void onSave(event)}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="desired_titles">Desired Titles</Label>
            <Textarea id="desired_titles" name="desired_titles" defaultValue={preferences?.desired_titles.join(", ") ?? defaultValues.desired_titles} placeholder="Software Engineer, Full Stack Developer" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="preferred_locations">Preferred Locations</Label>
            <Textarea id="preferred_locations" name="preferred_locations" defaultValue={preferences?.preferred_locations.join(", ") ?? defaultValues.preferred_locations} placeholder="Bangalore, Mumbai, Remote India" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remote_preference">Work Style</Label>
            <Input id="remote_preference" name="remote_preference" defaultValue={preferences?.remote_preference ?? defaultValues.remote_preference} placeholder="remote-first, remote-only, hybrid, onsite-only" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employment_types">Employment Types</Label>
            <Input id="employment_types" name="employment_types" defaultValue={preferences?.employment_types.join(", ") ?? defaultValues.employment_types} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="required_excluded_technologies">Required Excluded Technologies</Label>
            <Textarea id="required_excluded_technologies" name="required_excluded_technologies" defaultValue={preferences?.required_excluded_technologies.join(", ") ?? defaultValues.required_excluded_technologies} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_excluded_technologies">Preferred Excluded Technologies</Label>
            <Textarea id="preferred_excluded_technologies" name="preferred_excluded_technologies" defaultValue={preferences?.preferred_excluded_technologies.join(", ") ?? defaultValues.preferred_excluded_technologies} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salary_min">Minimum Salary (INR)</Label>
            <Input id="salary_min" name="salary_min" type="number" defaultValue={preferences?.salary_min?.toString() ?? defaultValues.salary_min} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salary_currency">Salary Currency</Label>
            <Input id="salary_currency" name="salary_currency" defaultValue={preferences?.salary_currency ?? defaultValues.salary_currency} />
          </div>
          <Button className="md:col-span-2" disabled={saving} type="submit">
            {saving ? <Loader2 className="animate-spin" /> : null}
            Save Preferences
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

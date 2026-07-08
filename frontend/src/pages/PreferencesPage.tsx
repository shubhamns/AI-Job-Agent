import { FormEvent } from "react";
import { toast } from "sonner";
import { PreferencesPage as PreferencesView } from "@/features/preferences/PreferencesPage";
import { usePreferences, useUpdatePreferences } from "@/hooks/queries";
import { defaultPreferenceForm } from "@/lib/constants";
import { csvToList } from "@/lib/format";
import { errorMessage } from "@/lib/errors";

export function PreferencesPage() {
  const preferencesQuery = usePreferences();
  const updatePreferences = useUpdatePreferences();

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await toast.promise(
      updatePreferences.mutateAsync({
        desired_titles: csvToList(String(form.get("desired_titles") ?? "")),
        preferred_locations: csvToList(String(form.get("preferred_locations") ?? "")),
        remote_preference: String(form.get("remote_preference") ?? "") || null,
        employment_types: csvToList(String(form.get("employment_types") ?? "")),
        required_excluded_technologies: csvToList(String(form.get("required_excluded_technologies") ?? "")),
        preferred_excluded_technologies: csvToList(String(form.get("preferred_excluded_technologies") ?? "")),
        salary_min: form.get("salary_min") ? Number(form.get("salary_min")) : null,
        salary_currency: String(form.get("salary_currency") ?? "") || null,
      }),
      {
        loading: "Saving preferences...",
        success: "Preferences saved",
        error: (error) => errorMessage(error, "Save failed"),
      },
    );
  }

  return (
    <PreferencesView
      preferences={preferencesQuery.data ?? null}
      defaultValues={defaultPreferenceForm}
      saving={updatePreferences.isPending}
      loading={preferencesQuery.isLoading}
      onSave={handleSave}
    />
  );
}

import { FormEvent } from "react";
import { toast } from "sonner";
import { ProfilePage as ProfileView } from "@/features/profile/ProfilePage";
import {
  useProfile,
  useTelegramLink,
  useTelegramStatus,
  useUpdateProfile,
  useUpdateTelegramSettings,
  useUploadResume,
} from "@/hooks/queries";
import { csvToList } from "@/lib/format";

export function ProfilePage() {
  const profileQuery = useProfile();
  const telegramQuery = useTelegramStatus();
  const updateProfile = useUpdateProfile();
  const uploadResume = useUploadResume();
  const telegramLink = useTelegramLink();
  const updateTelegram = useUpdateTelegramSettings();

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await toast.promise(
      updateProfile.mutateAsync({
        full_name: String(form.get("full_name") ?? "") || null,
        phone: String(form.get("phone") ?? "") || null,
        location: String(form.get("location") ?? "") || null,
        summary: String(form.get("summary") ?? "") || null,
        years_experience: form.get("years_experience") ? Number(form.get("years_experience")) : null,
        skills: csvToList(String(form.get("skills") ?? "")),
        work_authorization: profileQuery.data?.work_authorization ?? null,
      }),
      {
        loading: "Saving profile...",
        success: "Profile saved",
        error: (error) => (error instanceof Error ? error.message : "Save failed"),
      },
    );
  }

  async function handleResumeUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("resume");
    if (!(file instanceof File) || file.size === 0) return;
    await toast.promise(uploadResume.mutateAsync(file), {
      loading: "Uploading resume...",
      success: "Resume uploaded",
      error: (error) => (error instanceof Error ? error.message : "Upload failed"),
    });
  }

  async function handleConnectTelegram() {
    try {
      const link = await telegramLink.mutateAsync();
      window.open(link.link_url, "_blank", "noopener,noreferrer");
      toast.success("Open Telegram and press Start to link your account.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create Telegram link.");
    }
  }

  async function handleTelegramSettingsSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await toast.promise(
      updateTelegram.mutateAsync({
        notify_min_score: Number(form.get("notify_min_score") ?? 50),
        notifications_enabled: form.get("notifications_enabled") === "on",
      }),
      {
        loading: "Saving Telegram settings...",
        success: "Telegram settings saved",
        error: (error) => (error instanceof Error ? error.message : "Unable to save Telegram settings."),
      },
    );
  }

  return (
    <ProfileView
      profile={profileQuery.data ?? null}
      saving={updateProfile.isPending}
      uploading={uploadResume.isPending}
      loading={profileQuery.isLoading || telegramQuery.isLoading}
      telegramStatus={telegramQuery.data ?? null}
      telegramLoading={telegramLink.isPending || updateTelegram.isPending}
      onSave={handleSave}
      onResumeUpload={handleResumeUpload}
      onConnectTelegram={handleConnectTelegram}
      onTelegramSettingsSave={handleTelegramSettingsSave}
    />
  );
}

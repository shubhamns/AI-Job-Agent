import type { FormEvent } from "react";
import { Bell, Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { CandidateProfile, TelegramStatus } from "@/types";

function profileFormKey(profile: CandidateProfile | null) {
  if (!profile) return "empty";
  return [
    profile.id,
    profile.full_name,
    profile.phone,
    profile.location,
    profile.summary,
    profile.years_experience,
    profile.skills.join(","),
  ].join("|");
}

export function ProfilePage({
  profile,
  saving,
  uploading,
  loading,
  telegramStatus,
  telegramLoading,
  onSave,
  onResumeUpload,
  onConnectTelegram,
  onTelegramSettingsSave,
}: {
  profile: CandidateProfile | null;
  saving: boolean;
  uploading: boolean;
  loading: boolean;
  telegramStatus: TelegramStatus | null;
  telegramLoading: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onResumeUpload: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onConnectTelegram: () => Promise<void>;
  onTelegramSettingsSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resume Upload</CardTitle>
          <CardDescription>Upload your resume first — profile fields are filled from extracted resume data.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void onResumeUpload(event)}>
            <div className="space-y-2">
              <Label htmlFor="resume">Resume file</Label>
              <Input id="resume" name="resume" type="file" accept=".pdf,.docx" required />
            </div>
            <Button disabled={uploading} type="submit">
              {uploading ? <Loader2 className="animate-spin" /> : <Upload className="size-4" />}
              Upload Resume
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Telegram Alerts</CardTitle>
          <CardDescription>
            Connect Telegram to get hourly job matches and a daily summary without checking the app manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3 text-sm">
            <p>Status: {telegramStatus?.connected ? "Connected" : "Not connected"}</p>
            <p>Alerts: {telegramStatus?.notifications_enabled ? "On" : "Off"}</p>
            <p>Min score: {telegramStatus?.notify_min_score ?? 50}</p>
          </div>
          {!telegramStatus?.connected ? (
            <Button disabled={telegramLoading} onClick={() => void onConnectTelegram()} type="button">
              {telegramLoading ? <Loader2 className="animate-spin" /> : <Bell className="size-4" />}
              Connect Telegram
            </Button>
          ) : null}
          <form className="space-y-4" onSubmit={(event) => void onTelegramSettingsSave(event)}>
            <div className="space-y-2">
              <Label htmlFor="notify_min_score">Min match score</Label>
              <Input
                id="notify_min_score"
                name="notify_min_score"
                type="number"
                min={0}
                max={100}
                defaultValue={telegramStatus?.notify_min_score ?? 50}
              />
            </div>
            <div className="flex items-center justify-start gap-2">
              <input
                className="size-4 accent-primary"
                defaultChecked={telegramStatus?.notifications_enabled ?? true}
                id="notifications_enabled"
                name="notifications_enabled"
                type="checkbox"
              />
              <Label className="cursor-pointer" htmlFor="notifications_enabled">
                Enable hourly alerts
              </Label>
            </div>
            <Button disabled={telegramLoading || !telegramStatus?.connected} type="submit">
              {telegramLoading ? <Loader2 className="animate-spin" /> : <Check className="size-4" />}
              Save Telegram Settings
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Candidate Profile</CardTitle>
          <CardDescription>
            {profile
              ? "Review and edit details extracted from your resume."
              : "Upload a resume to populate your profile."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form key={profileFormKey(profile)} className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void onSave(event)}>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} placeholder="From resume" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} placeholder="From resume" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={profile?.location ?? ""} placeholder="From resume" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="years_experience">Years Experience</Label>
              <Input id="years_experience" name="years_experience" type="number" defaultValue={profile?.years_experience?.toString() ?? ""} placeholder="From resume" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea id="summary" name="summary" defaultValue={profile?.summary ?? ""} placeholder="From resume" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="skills">Skills (comma separated)</Label>
              <Textarea id="skills" name="skills" defaultValue={profile?.skills.join(", ") ?? ""} placeholder="From resume" />
            </div>
            <Button className="md:col-span-2" disabled={saving || !profile} type="submit">
              {saving ? <Loader2 className="animate-spin" /> : null}
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

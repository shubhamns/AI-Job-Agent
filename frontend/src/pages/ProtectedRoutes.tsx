import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { HomePage } from "@/pages/HomePage";
import { JobsPage } from "@/pages/JobsPage";
import { PreferencesPage } from "@/pages/PreferencesPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { TrackerPage } from "@/pages/TrackerPage";
import { InsightsPage } from "@/features/insights/InsightsPage";
import { StrategyPage } from "@/features/strategy/StrategyPage";

export function ProtectedRoutes() {
  const { user, logout } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return (
    <AppLayout email={user.email} onLogout={logout}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/tracker" element={<TrackerPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/strategy" element={<StrategyPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

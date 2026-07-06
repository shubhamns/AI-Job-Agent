import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { HomePage } from "@/pages/HomePage";
import { JobsPage } from "@/pages/JobsPage";
import { PreferencesPage } from "@/pages/PreferencesPage";
import { ProfilePage } from "@/pages/ProfilePage";

export function ProtectedRoutes() {
  const { user, logout } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return (
    <AppLayout email={user.email} onLogout={logout}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

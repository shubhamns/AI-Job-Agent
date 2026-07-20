import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/layout/PageLoader";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AuthPage } from "@/pages/AuthPage";
import { LandingPage } from "@/pages/LandingPage";
import { ProtectedRoutes } from "@/pages/ProtectedRoutes";

function AppRoutes() {
  const { user, bootLoading } = useAuth();
  const location = useLocation();

  if (bootLoading) {
    return <PageLoader label="Restoring session..." />;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route
        path="/"
        element={user ? <ProtectedRoutes /> : <LandingPage />}
      />
      <Route
        path="/*"
        element={
          user ? (
            <ProtectedRoutes />
          ) : (
            <Navigate to="/" replace state={{ from: location.pathname }} />
          )
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
      <Toaster richColors closeButton position="top-center" />
    </>
  );
}

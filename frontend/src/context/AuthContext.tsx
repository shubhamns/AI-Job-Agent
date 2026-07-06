import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { clearTokens, hasSession } from "@/lib/cookies";
import { useMe } from "@/hooks/queries";
import type { User } from "@/types";

type AuthContextValue = {
  user: User | null;
  bootLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = hasSession();
  const { data: user = null, isLoading, isError } = useMe();

  useEffect(() => {
    if (!isError) {
      return;
    }
    toast.error("Session expired. Please sign in again.");
    clearTokens();
    queryClient.clear();
    navigate("/login");
  }, [isError, navigate, queryClient]);

  function setUser(nextUser: User | null) {
    if (nextUser) {
      queryClient.setQueryData(queryKeys.me, nextUser);
      return;
    }
    queryClient.removeQueries({ queryKey: queryKeys.me });
  }

  function logout() {
    clearTokens();
    queryClient.clear();
    toast.info("Signed out");
    navigate("/login");
  }

  return (
    <AuthContext.Provider
      value={{
        user: session ? user : null,
        bootLoading: session && isLoading,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}

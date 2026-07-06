import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { useAuth } from "@/context/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { api } from "@/lib/api";
import { setTokens } from "@/lib/cookies";

type AuthMode = "login" | "register";

export function AuthPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<AuthMode>("login");

  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      authMode,
    }: {
      email: string;
      password: string;
      authMode: AuthMode;
    }) => {
      if (authMode === "register") {
        await api.register(email, password);
      }
      return api.login(email, password);
    },
    onSuccess: async (login) => {
      setTokens(login.access_token, login.refresh_token);
      const user = await queryClient.fetchQuery({
        queryKey: queryKeys.me,
        queryFn: () => api.me(),
      });
      setUser(user);
      navigate("/");
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    await toast.promise(loginMutation.mutateAsync({ email, password, authMode: mode }), {
      loading: mode === "register" ? "Creating account..." : "Signing in...",
      success: mode === "register" ? "Account created" : "Signed in successfully",
      error: (error) => (error instanceof Error ? error.message : "Authentication failed"),
    });
  }

  return (
    <AuthScreen
      mode={mode}
      loading={loginMutation.isPending}
      onSubmit={handleSubmit}
      onToggleMode={() => setMode(mode === "login" ? "register" : "login")}
    />
  );
}

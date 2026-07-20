import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { enterDemoSession } from "@/lib/demo/mockApi";
import { setTokens } from "@/lib/cookies";
import { queryKeys } from "@/lib/queryKeys";

export function useAuthLogin() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      register,
    }: {
      email: string;
      password: string;
      register?: boolean;
    }) => {
      if (register) {
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
}

export function useDemoLogin() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      enterDemoSession();
      return api.me();
    },
    onSuccess: (user) => {
      queryClient.clear();
      setUser(user);
      navigate("/");
    },
  });
}

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./cookies";
import { env } from "./env";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export const http = axios.create({
  baseURL: env.apiUrl,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }
  try {
    const { data } = await axios.post<TokenResponse>(
      `${env.apiUrl}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

http.interceptors.request.use((config) => {
  const skipAuth = config.headers?.["X-Skip-Auth"] === "true";
  if (skipAuth) {
    delete config.headers["X-Skip-Auth"];
    return config;
  }
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string }>) => {
    const config = error.config as RetryConfig | undefined;
    const skipAuth = config?.headers?.["X-Skip-Auth"] === "true";
    if (!config || error.response?.status !== 401 || config._retry || skipAuth) {
      return Promise.reject(error);
    }
    config._retry = true;
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const nextToken = await refreshPromise;
    if (!nextToken) {
      return Promise.reject(new Error("Session expired. Please sign in again."));
    }
    config.headers.Authorization = `Bearer ${nextToken}`;
    return http(config);
  },
);

export function getErrorMessage(error: unknown, fallback = "Request failed."): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      return "Cannot reach the API server. Make sure the backend is running on port 8002.";
    }
    return error.response?.data?.detail ?? error.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

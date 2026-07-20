function parseBoolean(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? "/api/v1",
  demoMode: parseBoolean(import.meta.env.VITE_DEMO_MODE),
} as const;

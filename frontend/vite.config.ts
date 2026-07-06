import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiBaseUrl = env.API_BASE_URL ?? process.env.API_BASE_URL ?? "http://localhost:8000/api/v1";
  return {
    plugins: [react(), tailwindcss()],
    define: {
      "import.meta.env.API_BASE_URL": JSON.stringify(apiBaseUrl),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      host: true,
    },
  };
});

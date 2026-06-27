import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: the Vite server proxies /api to the running ASP.NET host (see launchSettings.json).
// Build: output goes straight into the backend's wwwroot so `dotnet run` serves the SPA.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5179",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../FinanceAssistant/wwwroot",
    emptyOutDir: true,
  },
});

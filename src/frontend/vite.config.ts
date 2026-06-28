import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev: the Vite server proxies /api to the running ASP.NET host (see launchSettings.json).
// Build: output goes straight into the backend's wwwroot so `dotnet run` serves the SPA.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../FinanceAssistant/wwwroot",
    emptyOutDir: true,
  },
});

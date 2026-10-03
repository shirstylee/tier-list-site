import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createRawgHandler } from "./server/rawg.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "RAWG_");
  const handleRawg = createRawgHandler({ apiKey: process.env.RAWG_API_KEY ?? env.RAWG_API_KEY ?? "", trustProxy: false });
  const configureApi = (server) => {
    server.middlewares.use((request, response, next) => {
      if (!request.url?.startsWith("/api/")) return next();
      handleRawg(request, response).catch(() => {
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Каталог временно недоступен." }));
      });
    });
  };
  return {
  plugins: [react(), tailwindcss(), { name: "rawg-server-api", configureServer: configureApi, configurePreviewServer: configureApi }],
  server: {
    host: "127.0.0.1",
  },
  };
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: process.env.VITE_APP_PORT || 6202,
    proxy: {
      "/ws": {
        target: `http://localhost:${process.env.PORT || 6201}`,
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        target: `http://localhost:${process.env.PORT || 6201}`,
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname || __dirname, "./src"),
    },
  },
}));
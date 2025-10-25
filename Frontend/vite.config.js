import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/sitemap-profiles.xml': {
        target: 'https://rankbaaz.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
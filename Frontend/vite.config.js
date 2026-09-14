import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    outDir: process.env.VITE_OUT_DIR || "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-syntax-highlighter")) return "vendor-code";
          if (id.includes("katex") || id.includes("rehype-katex")) return "vendor-math";
          if (id.includes("hls.js")) return "vendor-hls";
          if (id.includes("@vidstack") || id.includes("vidstack")) return "vendor-video";
          if (id.includes("framer-motion") || id.includes("motion-dom")) return "vendor-motion";
          if (id.includes("animejs") || id.includes("lenis") || id.includes("@react-spring")) return "vendor-motion-tools";
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/sitemap-profiles.xml': {
        target: 'https://api.vidhgrow.online',
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

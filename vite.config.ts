import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
// PWA config added in Phase 6 (vite-plugin-pwa). Kept minimal for Foundation.
export default defineConfig({
  // GitHub Pages serves the app under /<repo>/; dev stays at /
  base: process.env.GITHUB_PAGES ? "/cassiopeia/" : "/",
  plugins: [preact()],
  server: { port: 5173 },
});

import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
// PWA config added in Phase 6 (vite-plugin-pwa). Kept minimal for Foundation.
export default defineConfig({
  plugins: [preact()],
  server: { port: 5173 },
});

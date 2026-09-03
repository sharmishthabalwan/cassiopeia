import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import preact from "@preact/preset-vite";

/** MCU 0.4 ships a few extensionless relative imports that native ESM rejects. */
function materialColorUtilitiesExtensions(): Plugin {
  return {
    name: "material-color-utilities-js-extensions",
    enforce: "pre",
    resolveId(id, importer) {
      if (
        importer?.includes("@material/material-color-utilities") &&
        id.startsWith(".") &&
        !id.endsWith(".js")
      ) {
        return resolve(dirname(importer), id + ".js");
      }
    },
  };
}

export default defineConfig({
  // GitHub Pages serves the app under /<repo>/; dev stays at /
  base: process.env.GITHUB_PAGES ? "/cassiopeia/" : "/",
  plugins: [preact(), materialColorUtilitiesExtensions()],
  server: { port: 5173 },
  optimizeDeps: {
    include: [
      "@material/material-color-utilities",
      "@material/web/icon/icon.js",
      "@material/web/typography/md-typescale-styles.js",
    ],
  },
});

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// nginx serves the build from /webtools, and the Dockerfile copies it from
// build/. The development server answers on the same path and forwards the
// three endpoints the page reads to a running Earshot, by default the one
// docker-compose publishes on localhost; set EARSHOT_URL to use another.
const earshot = process.env.EARSHOT_URL || "http://localhost";

export default defineConfig({
  base: "/webtools/",
  plugins: [react()],
  resolve: {
    alias: {
      stream: fileURLToPath(new URL("src/shims/stream.js", import.meta.url)),
      string_decoder: fileURLToPath(
        new URL("src/shims/string_decoder.js", import.meta.url)
      ),
    },
  },
  build: {
    outDir: "build",
    sourcemap: true,
  },
  server: {
    port: 3000,
    proxy: Object.fromEntries(
      ["/stat", "/nginxInfo", "/dash"].map((path) => [
        path,
        { target: earshot, changeOrigin: true },
      ])
    ),
  },
  test: {
    environment: "jsdom",
  },
});

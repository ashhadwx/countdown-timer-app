import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: path.join(__dirname, "../theme-extension/countdown-timer/assets"),
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/main.jsx"),
      name: "CountdownTimer",
      fileName: () => "countdown-widget.js",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: "esbuild",
    target: "es2020",
    cssCodeSplit: false,
    reportCompressedSize: true,
  },
});

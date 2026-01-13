import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["electron/main.ts", "electron/preload.ts", "electron/knowledge/kb-worker.ts"],
  outDir: "electron-dist",
  format: ["cjs"],
  sourcemap: true,
  clean: true,
  splitting: false,
  dts: false,
  external: ["electron", "better-sqlite3", "@lancedb/lancedb", "apache-arrow"],
  outExtension() {
    return { js: ".cjs" };
  },
});

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["electron/main.ts", "electron/preload.ts"],
  outDir: "electron-dist",
  format: ["cjs"],
  sourcemap: true,
  clean: true,
  splitting: false,
  dts: false,
  // Desktop 主进程必须打包 workspace TS 源码，否则运行时会 require 到 .ts 触发 SyntaxError。
  // 仍然保持 native/二进制依赖外置（electron/better-sqlite3）。
  noExternal: ["@prismax/database", "@prismax/core", "@prismax/shared", "@prismax/ai-sdk"],
  external: ["electron", "better-sqlite3"],
  outExtension() {
    return { js: ".cjs" };
  },
});

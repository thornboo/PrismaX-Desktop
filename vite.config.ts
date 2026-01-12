import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// 开发服务器端口 - 单一来源，避免多处硬编码
const DEV_SERVER_PORT = 3000;

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
  },
  server: {
    port: DEV_SERVER_PORT,
    strictPort: true, // 端口被占用时直接报错，而不是自动切换
  },
  // 将端口暴露给其他配置使用
  define: {
    __DEV_SERVER_PORT__: DEV_SERVER_PORT,
  },
});

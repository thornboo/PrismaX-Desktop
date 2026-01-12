import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { setupThemeListener, useThemeStore } from "./stores";

// 初始化主题
useThemeStore.getState().initTheme();

// 监听系统主题变化
setupThemeListener();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

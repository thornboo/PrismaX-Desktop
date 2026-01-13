/**
 * 主题状态管理
 */

import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  initTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "system",

  setTheme: async (theme: Theme) => {
    set({ theme });

    // 保存到设置
    if (window.electron) {
      await window.electron.settings.set("theme", theme);
    }

    // 应用主题
    applyTheme(theme);
  },

  initTheme: async () => {
    // 从设置加载主题
    if (window.electron) {
      const savedThemeRes = await window.electron.settings.get<Theme>("theme");
      if (savedThemeRes.success && savedThemeRes.data) {
        set({ theme: savedThemeRes.data });
        applyTheme(savedThemeRes.data);
        return;
      }
    }

    // 默认跟随系统
    applyTheme("system");
  },
}));

/**
 * 应用主题到 DOM
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === "system") {
    // 跟随系统
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", isDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

/**
 * 监听系统主题变化
 */
export function setupThemeListener(): () => void {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handler = () => {
    const { theme } = useThemeStore.getState();
    if (theme === "system") {
      applyTheme("system");
    }
  };

  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
}

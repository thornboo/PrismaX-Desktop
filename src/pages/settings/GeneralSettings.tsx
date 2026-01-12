import { useEffect, useState } from "react";
import { useThemeStore } from "@/stores";

type Theme = "light" | "dark" | "system";

export function GeneralSettings() {
  const { theme, setTheme, initTheme } = useThemeStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initTheme().finally(() => setLoading(false));
  }, [initTheme]);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as Theme);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">通用设置</h2>
      </div>

      <div className="space-y-4">
        {/* 主题设置 */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <div className="font-medium">主题</div>
            <div className="text-sm text-muted-foreground">选择应用主题</div>
          </div>
          <select
            value={theme}
            onChange={handleThemeChange}
            disabled={loading}
            className="px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>

        {/* 语言设置 */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <div className="font-medium">语言</div>
            <div className="text-sm text-muted-foreground">选择界面语言</div>
          </div>
          <select className="px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* 默认模型 */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <div className="font-medium">默认模型</div>
            <div className="text-sm text-muted-foreground">新会话使用的默认模型</div>
          </div>
          <select className="px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</option>
            <option value="deepseek-chat">DeepSeek Chat</option>
          </select>
        </div>

        {/* 发送快捷键 */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <div className="font-medium">发送快捷键</div>
            <div className="text-sm text-muted-foreground">发送消息的快捷键</div>
          </div>
          <select className="px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="enter">Enter 发送</option>
            <option value="ctrl-enter">Ctrl + Enter 发送</option>
          </select>
        </div>

        {/* 开机自启 */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <div className="font-medium">开机自启</div>
            <div className="text-sm text-muted-foreground">系统启动时自动运行应用</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked="false"
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span className="inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform translate-x-1" />
          </button>
        </div>

        {/* 最小化到托盘 */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <div className="font-medium">最小化到托盘</div>
            <div className="text-sm text-muted-foreground">关闭窗口时最小化到系统托盘</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked="true"
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span className="inline-block h-4 w-4 transform rounded-full bg-primary-foreground shadow-sm transition-transform translate-x-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

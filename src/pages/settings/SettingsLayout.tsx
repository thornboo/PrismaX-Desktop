import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, Settings, Cpu, Keyboard, Database, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const settingsNav = [
  { path: "/settings", label: "通用", icon: Settings },
  { path: "/settings/models", label: "模型", icon: Cpu },
  { path: "/settings/shortcuts", label: "快捷键", icon: Keyboard },
  { path: "/settings/data", label: "数据", icon: Database },
  { path: "/settings/about", label: "关于", icon: Info },
];

export function SettingsLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Link to="/" className="p-2 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold">设置</h1>
      </div>

      {/* 设置内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧导航 */}
        <nav className="w-48 border-r border-border p-2 overflow-y-auto">
          <ul className="space-y-1">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                    )}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 右侧内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

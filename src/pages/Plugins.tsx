import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Puzzle,
  Search,
  MoreHorizontal,
  Globe,
  Code,
  FileSearch,
} from "lucide-react";

export function Plugins() {
  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold">插件</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Plus size={18} />
          <span>安装插件</span>
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="p-4 border-b border-border">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <input
            type="text"
            placeholder="搜索插件..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* 插件列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 已安装插件 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">已安装</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Globe className="text-blue-500" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium">网页搜索</h3>
                    <p className="text-sm text-muted-foreground mt-1">使用 Tavily 搜索网页内容</p>
                  </div>
                </div>
                <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                  <MoreHorizontal size={16} />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">v1.0.0</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  已启用
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Code className="text-purple-500" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium">代码执行</h3>
                    <p className="text-sm text-muted-foreground mt-1">在沙箱中执行代码</p>
                  </div>
                </div>
                <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                  <MoreHorizontal size={16} />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">v1.2.0</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  已启用
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 推荐插件 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">推荐插件</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <FileSearch className="text-orange-500" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium">文档解析</h3>
                    <p className="text-sm text-muted-foreground mt-1">解析 PDF、Word 等文档</p>
                  </div>
                </div>
                <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                  <MoreHorizontal size={16} />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">v2.1.0</span>
                <button className="px-3 py-1 text-xs rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                  安装
                </button>
              </div>
            </div>

            {/* 添加插件占位 */}
            <div className="p-4 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center min-h-[140px]">
              <div className="text-center text-muted-foreground">
                <Puzzle size={24} className="mx-auto mb-2" />
                <span className="text-sm">浏览插件市场</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

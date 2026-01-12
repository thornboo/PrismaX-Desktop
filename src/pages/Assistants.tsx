import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Bot, Search, MoreHorizontal } from "lucide-react";

export function Assistants() {
  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold">助手</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Plus size={18} />
          <span>新建助手</span>
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
            placeholder="搜索助手..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* 助手列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* 预设助手卡片 */}
          <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Bot className="text-blue-500" size={24} />
                </div>
                <div>
                  <h3 className="font-medium">通用助手</h3>
                  <p className="text-sm text-muted-foreground mt-1">日常对话和问答</p>
                </div>
              </div>
              <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-muted">GPT-4o</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                默认
              </span>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Bot className="text-purple-500" size={24} />
                </div>
                <div>
                  <h3 className="font-medium">代码专家</h3>
                  <p className="text-sm text-muted-foreground mt-1">编程辅助和代码审查</p>
                </div>
              </div>
              <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-muted">Claude 3.5</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Bot className="text-orange-500" size={24} />
                </div>
                <div>
                  <h3 className="font-medium">写作助手</h3>
                  <p className="text-sm text-muted-foreground mt-1">内容创作和文案优化</p>
                </div>
              </div>
              <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-muted">GPT-4o</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Bot className="text-green-500" size={24} />
                </div>
                <div>
                  <h3 className="font-medium">翻译专家</h3>
                  <p className="text-sm text-muted-foreground mt-1">多语言翻译</p>
                </div>
              </div>
              <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-muted">GPT-4o</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Bot className="text-cyan-500" size={24} />
                </div>
                <div>
                  <h3 className="font-medium">数据分析师</h3>
                  <p className="text-sm text-muted-foreground mt-1">数据分析和可视化</p>
                </div>
              </div>
              <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-muted">GPT-4o</span>
            </div>
          </div>

          {/* 添加助手占位 */}
          <div className="p-4 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center min-h-[140px]">
            <div className="text-center text-muted-foreground">
              <Plus size={24} className="mx-auto mb-2" />
              <span className="text-sm">创建自定义助手</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

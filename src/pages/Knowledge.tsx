import { Link } from "react-router-dom";
import { ArrowLeft, Plus, FolderOpen, FileText, Search } from "lucide-react";

export function Knowledge() {
  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold">知识库</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Plus size={18} />
          <span>新建知识库</span>
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
            placeholder="搜索知识库..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* 知识库列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* 示例知识库卡片 */}
          <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="text-primary" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">项目文档</h3>
                <p className="text-sm text-muted-foreground mt-1">用于项目相关技术文档问答</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText size={14} />
                    12 个文档
                  </span>
                  <span>创建于 2024-01-10</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="text-primary" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">学习资料</h3>
                <p className="text-sm text-muted-foreground mt-1">编程学习资源</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText size={14} />8 个文档
                  </span>
                  <span>创建于 2024-01-08</span>
                </div>
              </div>
            </div>
          </div>

          {/* 空状态占位 */}
          <div className="p-4 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center min-h-[120px]">
            <div className="text-center text-muted-foreground">
              <Plus size={24} className="mx-auto mb-2" />
              <span className="text-sm">添加知识库</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Download, Upload, Trash2, FolderOpen } from "lucide-react";

export function DataSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">数据管理</h2>
      </div>

      {/* 数据存储位置 */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">存储位置</h3>
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">数据目录</div>
              <div className="text-sm text-muted-foreground mt-1">
                ~/Library/Application Support/PrismaX-Desktop
              </div>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors">
              <FolderOpen size={16} />
              <span>打开</span>
            </button>
          </div>
        </div>
      </section>

      {/* 数据导出 */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">数据导出</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <div className="font-medium">导出所有会话</div>
              <div className="text-sm text-muted-foreground">导出所有聊天记录为 JSON 格式</div>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors">
              <Download size={16} />
              <span>导出</span>
            </button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <div className="font-medium">导出设置</div>
              <div className="text-sm text-muted-foreground">导出应用配置（不含 API Key）</div>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors">
              <Download size={16} />
              <span>导出</span>
            </button>
          </div>
        </div>
      </section>

      {/* 数据导入 */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">数据导入</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <div className="font-medium">导入会话</div>
              <div className="text-sm text-muted-foreground">从 JSON 文件导入聊天记录</div>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors">
              <Upload size={16} />
              <span>导入</span>
            </button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <div className="font-medium">导入设置</div>
              <div className="text-sm text-muted-foreground">从配置文件恢复设置</div>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors">
              <Upload size={16} />
              <span>导入</span>
            </button>
          </div>
        </div>
      </section>

      {/* 危险操作 */}
      <section>
        <h3 className="text-sm font-medium text-destructive mb-3">危险操作</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/50 bg-destructive/5">
            <div>
              <div className="font-medium">清空所有会话</div>
              <div className="text-sm text-muted-foreground">删除所有聊天记录，此操作不可恢复</div>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
              <Trash2 size={16} />
              <span>清空</span>
            </button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/50 bg-destructive/5">
            <div>
              <div className="font-medium">重置应用</div>
              <div className="text-sm text-muted-foreground">
                清除所有数据和设置，恢复到初始状态
              </div>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
              <Trash2 size={16} />
              <span>重置</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

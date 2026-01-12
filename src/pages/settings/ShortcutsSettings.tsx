export function ShortcutsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">快捷键</h2>
      </div>

      {/* 全局快捷键 */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">全局快捷键</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>显示/隐藏窗口</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + Shift + Space</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>新建会话</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + N</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>关闭当前会话</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + W</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>打开设置</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + ,</kbd>
          </div>
        </div>
      </section>

      {/* 聊天快捷键 */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">聊天快捷键</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>发送消息</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">Enter</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>换行</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">Shift + Enter</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>发送并新建会话</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + Enter</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>编辑上一条消息</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">↑</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>重新生成</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + R</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>复制最后回复</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + C</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>快速切换模型</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + K</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>停止生成</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">Escape</kbd>
          </div>
        </div>
      </section>

      {/* 导航快捷键 */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">导航快捷键</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>切换侧边栏</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + B</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>搜索会话</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + F</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>上一个会话</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + [</kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span>下一个会话</span>
            <kbd className="px-2 py-1 text-xs rounded bg-muted font-mono">⌘ + ]</kbd>
          </div>
        </div>
      </section>
    </div>
  );
}

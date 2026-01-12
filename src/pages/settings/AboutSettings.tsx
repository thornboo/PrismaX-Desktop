import { ExternalLink } from "lucide-react";

export function AboutSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">关于</h2>
      </div>

      {/* 应用信息 */}
      <div className="p-6 rounded-lg border border-border text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="text-3xl">✨</span>
        </div>
        <h3 className="text-xl font-bold">PrismaX-Desktop</h3>
        <p className="text-muted-foreground mt-1">新一代 AI 聊天助手</p>
      </div>

      {/* 版本信息 */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">版本信息</h3>
        <div className="p-4 rounded-lg border border-border space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">应用版本</span>
            <span className="font-mono">0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Electron</span>
            <span className="font-mono">33.x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">React</span>
            <span className="font-mono">19.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Node.js</span>
            <span className="font-mono">20.x</span>
          </div>
        </div>
      </section>

      {/* 链接 */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">链接</h3>
        <div className="space-y-2">
          <a
            href="#"
            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <span>GitHub 仓库</span>
            <ExternalLink size={16} className="text-muted-foreground" />
          </a>
          <a
            href="#"
            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <span>问题反馈</span>
            <ExternalLink size={16} className="text-muted-foreground" />
          </a>
          <a
            href="#"
            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <span>更新日志</span>
            <ExternalLink size={16} className="text-muted-foreground" />
          </a>
          <a
            href="#"
            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <span>开源许可</span>
            <ExternalLink size={16} className="text-muted-foreground" />
          </a>
        </div>
      </section>

      {/* 检查更新 */}
      <div className="pt-4">
        <button className="w-full py-2 px-4 rounded-lg border border-input hover:bg-accent transition-colors">
          检查更新
        </button>
      </div>

      {/* 版权信息 */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>© 2024 PrismaX-Desktop. All rights reserved.</p>
        <p className="mt-1">Made with ❤️</p>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Download, Upload, Trash2, FolderOpen, RefreshCw } from "lucide-react";
import { isIpcCancelled } from "@/lib/ipc";
import { useConversationStore } from "@/stores";

export function DataSettings() {
  const [appInfo, setAppInfo] = useState<{
    userDataPath: string;
    databaseFilePath: string;
    appVersion: string;
    platform: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const currentPathLabel = useMemo(() => {
    if (!appInfo) return "加载中…";
    return appInfo.userDataPath;
  }, [appInfo]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      const infoRes = await window.electron.system.getAppInfo();
      if (canceled) return;
      if (!infoRes.success) {
        setAppInfo(null);
        return;
      }
      setAppInfo(infoRes.data);
    })();
    return () => {
      canceled = true;
    };
  }, []);

  const refresh = async () => {
    setBusy(true);
    try {
      await loadConversations();
      const infoRes = await window.electron.system.getAppInfo();
      if (infoRes.success) setAppInfo(infoRes.data);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenDataDir = async () => {
    if (!appInfo) return;
    const result = await window.electron.system.openPath(appInfo.userDataPath);
    if (result.success) return;
    if (isIpcCancelled(result)) return;
    alert(result.error);
  };

  const handleMigrateDataDir = async () => {
    const dirRes = await window.electron.system.selectDirectory();
    if (!dirRes.success) {
      if (isIpcCancelled(dirRes)) return;
      alert(dirRes.error);
      return;
    }

    setBusy(true);
    try {
      const result = await window.electron.data.migrateDataRoot(dirRes.data);
      if (!result.success) {
        if (isIpcCancelled(result)) return;
        alert(result.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleExportConversations = async () => {
    setBusy(true);
    try {
      const result = await window.electron.data.exportConversations();
      if (!result.success) {
        if (isIpcCancelled(result)) return;
        alert(result.error);
        return;
      }
      alert(`已导出到：${result.data.filePath}`);
    } finally {
      setBusy(false);
    }
  };

  const handleExportSettings = async () => {
    setBusy(true);
    try {
      const result = await window.electron.data.exportSettings();
      if (!result.success) {
        if (isIpcCancelled(result)) return;
        alert(result.error);
        return;
      }
      alert(`已导出到：${result.data.filePath}\n\n注意：不包含 API Key。`);
    } finally {
      setBusy(false);
    }
  };

  const handleImportConversations = async () => {
    setBusy(true);
    try {
      const result = await window.electron.data.importConversations();
      if (!result.success) {
        if (isIpcCancelled(result)) return;
        alert(result.error);
        return;
      }
      await loadConversations();
      alert(
        `导入完成：\n- 会话：${result.data.conversationsAdded}\n- 消息：${result.data.messagesAdded}\n\n来源：${result.data.filePath}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleImportSettings = async () => {
    setBusy(true);
    try {
      const result = await window.electron.data.importSettings();
      if (!result.success) {
        if (isIpcCancelled(result)) return;
        alert(result.error);
        return;
      }
      alert(
        `导入完成：\n- 设置项：${result.data.settingsUpdated}\n- 提供商配置：${result.data.providersUpdated}\n\n来源：${result.data.filePath}\n\n注意：不包含 API Key。`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleClearAllConversations = async () => {
    setBusy(true);
    try {
      const result = await window.electron.data.clearAllConversations();
      if (!result.success) {
        if (isIpcCancelled(result)) return;
        alert(result.error);
        return;
      }
      await loadConversations();
      alert(
        `已清空：\n- 会话：${result.data.deletedConversations}\n- 消息：${result.data.deletedMessages}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleResetApp = async () => {
    setBusy(true);
    try {
      const result = await window.electron.data.resetApp();
      if (!result.success) {
        if (isIpcCancelled(result)) return;
        alert(result.error);
        return;
      }
      await refresh();
      alert("重置完成。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">数据管理</h2>
          <button
            onClick={refresh}
            disabled={busy}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            title="刷新"
          >
            <RefreshCw size={16} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 数据存储位置 */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">存储位置</h3>
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">数据目录</div>
              <div className="text-sm text-muted-foreground mt-1">{currentPathLabel}</div>
              {appInfo && (
                <div className="text-xs text-muted-foreground mt-2">
                  数据库：{appInfo.databaseFilePath}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenDataDir}
                disabled={busy || !appInfo}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                <FolderOpen size={16} />
                <span>打开</span>
              </button>
              <button
                onClick={handleMigrateDataDir}
                disabled={busy}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                <span>迁移</span>
              </button>
            </div>
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
            <button
              onClick={handleExportConversations}
              disabled={busy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Download size={16} />
              <span>导出</span>
            </button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <div className="font-medium">导出设置</div>
              <div className="text-sm text-muted-foreground">导出应用配置（不含 API Key）</div>
            </div>
            <button
              onClick={handleExportSettings}
              disabled={busy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
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
            <button
              onClick={handleImportConversations}
              disabled={busy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Upload size={16} />
              <span>导入</span>
            </button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <div className="font-medium">导入设置</div>
              <div className="text-sm text-muted-foreground">从配置文件恢复设置</div>
            </div>
            <button
              onClick={handleImportSettings}
              disabled={busy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
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
            <button
              onClick={handleClearAllConversations}
              disabled={busy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
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
            <button
              onClick={handleResetApp}
              disabled={busy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              <span>重置</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

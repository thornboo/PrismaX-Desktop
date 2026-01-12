import { useEffect, useState } from "react";
import { Plus, Check, X, Eye, EyeOff, Loader2 } from "lucide-react";
import type { Provider, Model } from "@/types/electron.d";

export function ModelsSettings() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Record<string, Model[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  // 加载提供商和模型数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const providersData = await window.electron.provider.getAll();
      setProviders(providersData);

      // 加载每个提供商的模型
      const modelsData: Record<string, Model[]> = {};
      for (const provider of providersData) {
        const providerModels = await window.electron.provider.getModels(provider.id);
        modelsData[provider.id] = providerModels;
      }
      setModels(modelsData);
    } catch (error) {
      console.error("加载数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 更新提供商配置
  const handleUpdateProvider = async (
    id: string,
    updates: { apiKey?: string; baseUrl?: string; enabled?: boolean },
  ) => {
    try {
      setSaving(id);
      const updated = await window.electron.provider.update(id, updates);
      if (updated) {
        setProviders((prev) => prev.map((p) => (p.id === id ? updated : p)));
      }
    } catch (error) {
      console.error("更新失败:", error);
    } finally {
      setSaving(null);
    }
  };

  // 切换 API Key 显示
  const toggleShowApiKey = (id: string) => {
    setShowApiKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">模型配置</h2>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors">
          <Plus size={16} />
          <span>添加提供商</span>
        </button>
      </div>

      <div className="space-y-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            models={models[provider.id] || []}
            showApiKey={showApiKey[provider.id] || false}
            saving={saving === provider.id}
            onToggleShowApiKey={() => toggleShowApiKey(provider.id)}
            onUpdate={(updates) => handleUpdateProvider(provider.id, updates)}
          />
        ))}
      </div>
    </div>
  );
}

interface ProviderCardProps {
  provider: Provider;
  models: Model[];
  showApiKey: boolean;
  saving: boolean;
  onToggleShowApiKey: () => void;
  onUpdate: (updates: { apiKey?: string; baseUrl?: string; enabled?: boolean }) => void;
}

function ProviderCard({
  provider,
  models,
  showApiKey,
  saving,
  onToggleShowApiKey,
  onUpdate,
}: ProviderCardProps) {
  const [apiKey, setApiKey] = useState(provider.apiKey || "");
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl || "");
  const [isDirty, setIsDirty] = useState(false);

  // 获取提供商图标颜色
  const getProviderColor = (id: string) => {
    switch (id) {
      case "openai":
        return "bg-green-500/10 text-green-500";
      case "anthropic":
        return "bg-orange-500/10 text-orange-500";
      case "ollama":
        return "bg-purple-500/10 text-purple-500";
      case "deepseek":
        return "bg-cyan-500/10 text-cyan-500";
      case "google":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // 获取提供商图标
  const getProviderIcon = (id: string) => {
    switch (id) {
      case "openai":
        return "O";
      case "anthropic":
        return "A";
      case "ollama":
        return "🦙";
      case "deepseek":
        return "D";
      case "google":
        return "G";
      default:
        return id[0].toUpperCase();
    }
  };

  const handleSave = () => {
    onUpdate({ apiKey, baseUrl: baseUrl || undefined });
    setIsDirty(false);
  };

  const handleToggleEnabled = () => {
    onUpdate({ enabled: !provider.enabled });
  };

  return (
    <div className="p-4 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${getProviderColor(provider.id)}`}
          >
            {getProviderIcon(provider.id)}
          </div>
          <div className="font-medium">{provider.name}</div>
        </div>
        <div className="flex items-center gap-2">
          {provider.enabled ? (
            <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              <Check size={12} />
              已启用
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
              <X size={12} />
              未启用
            </span>
          )}
          <button
            onClick={handleToggleEnabled}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
              provider.enabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform ${
                provider.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* API Key（Ollama 不需要） */}
        {provider.id !== "ollama" && (
          <div>
            <label className="text-sm text-muted-foreground">API Key</label>
            <div className="relative mt-1">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setIsDirty(true);
                }}
                placeholder={`输入 ${provider.name} API Key`}
                className="w-full pr-10 px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={onToggleShowApiKey}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* 端点地址 */}
        <div>
          <label className="text-sm text-muted-foreground">
            API 端点{provider.id === "ollama" ? "" : "（可选）"}
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setIsDirty(true);
            }}
            placeholder={getDefaultBaseUrl(provider.id)}
            className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* 可用模型 */}
        <div className="text-sm text-muted-foreground">
          可用模型：{models.map((m) => m.name).join(", ") || "无"}
        </div>

        {/* 保存按钮 */}
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            保存
          </button>
        )}
      </div>
    </div>
  );
}

function getDefaultBaseUrl(providerId: string): string {
  switch (providerId) {
    case "openai":
      return "https://api.openai.com/v1";
    case "anthropic":
      return "https://api.anthropic.com/v1";
    case "ollama":
      return "http://localhost:11434";
    case "deepseek":
      return "https://api.deepseek.com";
    case "google":
      return "https://generativelanguage.googleapis.com/v1beta";
    default:
      return "";
  }
}

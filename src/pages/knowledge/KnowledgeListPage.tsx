import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FolderOpen, Plus, Search, Trash2 } from "lucide-react";
import type { KnowledgeBaseType } from "./types";
import { formatDate } from "./utils/format";

export function KnowledgeListPage() {
  const navigate = useNavigate();
  const [bases, setBases] = useState<KnowledgeBaseType[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bases;
    return bases.filter((b) => {
      const hay = `${b.name} ${b.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [bases, search]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await window.electron.knowledge.listBases();
      setBases(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    const name = prompt("请输入知识库名称");
    if (!name) return;
    const description = prompt("请输入描述（可选）") ?? null;
    const created = await window.electron.knowledge.createBase({ name, description });
    await load();
    navigate(`/knowledge/${created.id}`);
  };

  const handleDelete = async (kbId: string) => {
    const confirmed = confirm("⚠️ 危险操作：确定要删除该知识库及其所有文件吗？此操作不可恢复。");
    if (!confirmed) return;
    await window.electron.knowledge.deleteBase({ kbId, confirmed: true });
    await load();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold">知识库</h1>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          <span>新建知识库</span>
        </button>
      </div>

      <div className="p-4 border-b border-border">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索知识库..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-sm text-muted-foreground">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">暂无知识库</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((kb) => (
              <div
                key={kb.id}
                className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FolderOpen className="text-primary" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/knowledge/${kb.id}`}
                      className="font-medium truncate block hover:underline"
                    >
                      {kb.name}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {kb.description ?? "—"}
                    </p>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>更新于 {formatDate(kb.updatedAt)}</span>
                      <button
                        onClick={() => void handleDelete(kb.id)}
                        className="p-1 rounded hover:bg-destructive/20 text-destructive"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

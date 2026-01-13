import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FolderOpen,
  Import,
  Pause,
  Play,
  Search,
  Square,
  Trash2,
  Wand2,
} from "lucide-react";

type KnowledgeBaseType = Awaited<ReturnType<typeof window.electron.knowledge.listBases>>[number];
type KnowledgeJob = Awaited<ReturnType<typeof window.electron.knowledge.listJobs>>[number];
type SearchResult = Awaited<ReturnType<typeof window.electron.knowledge.search>>["results"][number];
type KnowledgeDocument = Awaited<
  ReturnType<typeof window.electron.knowledge.listDocuments>
>[number];
type Provider = Awaited<ReturnType<typeof window.electron.provider.getAll>>[number];
type KnowledgeVectorConfig = Awaited<
  ReturnType<typeof window.electron.knowledge.getVectorConfig>
>["config"];
type SemanticResult = Awaited<
  ReturnType<typeof window.electron.knowledge.semanticSearch>
>["results"][number];

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "-";
  }
}

function formatProgress(current: number, total: number): string {
  if (!total) return `${current}`;
  const pct = Math.floor((current / total) * 100);
  return `${current}/${total} (${pct}%)`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function KnowledgeBase() {
  const { kbId } = useParams<{ kbId: string }>();
  const navigate = useNavigate();
  const [kb, setKb] = useState<KnowledgeBaseType | null>(null);
  const [stats, setStats] = useState<{ documents: number; chunks: number; jobs: number } | null>(
    null,
  );
  const [jobs, setJobs] = useState<KnowledgeJob[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [embeddingProviderId, setEmbeddingProviderId] = useState("openai");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [vectorConfig, setVectorConfig] = useState<KnowledgeVectorConfig>(null);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([]);
  const [semanticTopK, setSemanticTopK] = useState(10);
  const [busy, setBusy] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const kbIdSafe = kbId ?? "";

  const activeJobs = useMemo(() => {
    return jobs.filter((j) => ["pending", "processing", "paused"].includes(String(j.status)));
  }, [jobs]);

  const loadAll = async () => {
    if (!kbIdSafe) return;
    setBusy(true);
    try {
      const bases = await window.electron.knowledge.listBases();
      const found = bases.find((b) => b.id === kbIdSafe) ?? null;
      setKb(found);
      setProviders(await window.electron.provider.getAll());
      setJobs(await window.electron.knowledge.listJobs(kbIdSafe));
      setDocuments(await window.electron.knowledge.listDocuments({ kbId: kbIdSafe, limit: 200 }));
      setStats(await window.electron.knowledge.getStats(kbIdSafe));
      setVectorConfig((await window.electron.knowledge.getVectorConfig(kbIdSafe)).config);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, [kbIdSafe]);

  useEffect(() => {
    const enabled = providers.filter((p) => p.enabled);
    if (enabled.length === 0) return;
    if (enabled.some((p) => p.id === embeddingProviderId)) return;
    setEmbeddingProviderId(enabled[0].id);
  }, [providers, embeddingProviderId]);

  useEffect(() => {
    const off = window.electron.knowledge.onJobUpdate((payload) => {
      const data = payload as any;
      if (!data || data.kbId !== kbIdSafe || !data.job) return;
      const job = data.job as KnowledgeJob;
      setJobs((prev) => {
        const next = [...prev];
        const idx = next.findIndex((j) => j.id === job.id);
        if (idx >= 0) {
          next[idx] = job;
          return next;
        }
        return [job, ...next];
      });
    });
    return off;
  }, [kbIdSafe]);

  const handleOpenDir = async () => {
    if (!kb?.dir) return;
    await window.electron.system.openPath(kb.dir);
  };

  const handleImportFiles = async () => {
    if (!kbIdSafe) return;
    const filePaths = await window.electron.knowledge.selectFiles();
    if (!filePaths || filePaths.length === 0) return;
    await window.electron.knowledge.importFiles({
      kbId: kbIdSafe,
      sources: [{ type: "files", paths: filePaths }],
    });
    await loadAll();
  };

  const handleImportDirectory = async () => {
    if (!kbIdSafe) return;
    const dir = await window.electron.system.selectDirectory();
    if (!dir) return;
    await window.electron.knowledge.importFiles({
      kbId: kbIdSafe,
      sources: [{ type: "directory", paths: [dir] }],
    });
    await loadAll();
  };

  const handleSearch = async () => {
    if (!kbIdSafe) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const res = await window.electron.knowledge.search({ kbId: kbIdSafe, query: q, limit: 30 });
    setResults(res.results);
  };

  const handleSemanticSearch = async () => {
    if (!kbIdSafe) return;
    if (!embeddingProviderId) {
      alert("请先选择并启用一个提供商");
      return;
    }
    const q = semanticQuery.trim();
    if (!q) {
      setSemanticResults([]);
      return;
    }
    const res = await window.electron.knowledge.semanticSearch({
      kbId: kbIdSafe,
      providerId: embeddingProviderId,
      model: embeddingModel.trim(),
      query: q,
      topK: semanticTopK,
    });
    setSemanticResults(res.results);
  };

  const handleBuildVectorIndex = async () => {
    if (!kbIdSafe) return;
    if (!embeddingProviderId) {
      alert("请先选择并启用一个提供商");
      return;
    }
    await window.electron.knowledge.buildVectorIndex({
      kbId: kbIdSafe,
      providerId: embeddingProviderId,
      model: embeddingModel.trim(),
    });
    await loadAll();
  };

  const handleRebuildVectorIndex = async () => {
    if (!kbIdSafe) return;
    const confirmed = confirm(
      "⚠️ 危险操作：将删除该知识库的向量索引（派生数据）并清空索引状态，之后需要重新构建。是否继续？",
    );
    if (!confirmed) return;
    await window.electron.knowledge.rebuildVectorIndex({ kbId: kbIdSafe, confirmed: true });
    setSemanticResults([]);
    await loadAll();
  };

  const handleCreateNote = async () => {
    if (!kbIdSafe) return;
    if (!noteTitle.trim()) {
      alert("请输入笔记标题");
      return;
    }
    await window.electron.knowledge.createNote({
      kbId: kbIdSafe,
      title: noteTitle.trim(),
      content: noteContent,
    });
    setNoteTitle("");
    setNoteContent("");
    await loadAll();
  };

  const handleDeleteBase = async () => {
    if (!kbIdSafe) return;
    const confirmed = confirm("⚠️ 危险操作：确定要删除该知识库及其所有文件吗？此操作不可恢复。");
    if (!confirmed) return;
    await window.electron.knowledge.deleteBase({ kbId: kbIdSafe, confirmed: true });
    navigate("/knowledge");
  };

  const handleDeleteDocument = async (documentId: string) => {
    const confirmed = confirm("⚠️ 危险操作：确定要从知识库删除该文档吗？相关索引也会被删除。");
    if (!confirmed) return;
    await window.electron.knowledge.deleteDocument({ kbId: kbIdSafe, documentId, confirmed: true });
    await loadAll();
  };

  const handlePause = async (jobId: string) => {
    await window.electron.knowledge.pauseJob({ kbId: kbIdSafe, jobId });
    await loadAll();
  };

  const handleResume = async (jobId: string, jobType: string) => {
    if (jobType === "build_vectors") {
      if (!embeddingProviderId) {
        alert("请先选择并启用一个提供商");
        return;
      }
      await window.electron.knowledge.resumeVectorIndex({
        kbId: kbIdSafe,
        jobId,
        providerId: embeddingProviderId,
        model: embeddingModel.trim(),
      });
    } else {
      await window.electron.knowledge.resumeJob({ kbId: kbIdSafe, jobId });
    }
    await loadAll();
  };

  const handleCancel = async (jobId: string) => {
    const confirmed = confirm("⚠️ 危险操作：确定要取消该导入任务吗？未处理项将被标记为跳过。");
    if (!confirmed) return;
    await window.electron.knowledge.cancelJob({ kbId: kbIdSafe, jobId });
    await loadAll();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/knowledge" className="p-2 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">{kb?.name ?? "知识库"}</h1>
            <div className="text-xs text-muted-foreground truncate">{kb?.description ?? "—"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenDir}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <FolderOpen size={16} />
            <span className="text-sm">打开目录</span>
          </button>
          <button
            onClick={handleDeleteBase}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-destructive/20 text-destructive transition-colors"
          >
            <Trash2 size={16} />
            <span className="text-sm">删除</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-medium">概览</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {stats ? (
              <>
                文档 {stats.documents} · 分块 {stats.chunks} · 任务 {stats.jobs}
              </>
            ) : (
              "加载中..."
            )}
          </div>
          {busy && <div className="mt-2 text-xs text-muted-foreground">处理中...</div>}
        </div>

        {/* Import */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">导入</div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImportFiles}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Import size={16} />
                <span className="text-sm">导入文件</span>
              </button>
              <button
                onClick={handleImportDirectory}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <Import size={16} />
                <span className="text-sm">导入目录</span>
              </button>
            </div>
          </div>
          {activeJobs.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              当前有 {activeJobs.length}{" "}
              个未完成任务，导入会自动串行处理（同一知识库一次只跑一个）。
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-medium">文档</div>
          {documents.length === 0 ? (
            <div className="mt-2 text-sm text-muted-foreground">暂无文档</div>
          ) : (
            <div className="mt-3 space-y-2">
              {documents.slice(0, 50).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">
                      {doc.title}{" "}
                      <span className="text-xs text-muted-foreground">({doc.kind})</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {doc.sourcePath ? doc.sourcePath : "—"} · {formatBytes(doc.sizeBytes)} · 更新{" "}
                      {formatDate(doc.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => void handleDeleteDocument(doc.id)}
                    className="p-2 rounded hover:bg-destructive/20 text-destructive transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {documents.length > 50 && (
                <div className="text-xs text-muted-foreground">仅显示最近 50 条</div>
              )}
            </div>
          )}
        </div>

        {/* Jobs */}
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-medium">任务</div>
          {jobs.length === 0 ? (
            <div className="mt-2 text-sm text-muted-foreground">暂无任务</div>
          ) : (
            <div className="mt-3 space-y-2">
              {jobs.slice(0, 20).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-3 rounded border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">
                      {job.type} · <span className="text-muted-foreground">{job.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      进度 {formatProgress(job.progressCurrent, job.progressTotal)} · 更新{" "}
                      {formatDate(job.updatedAt)}
                    </div>
                    {job.errorMessage && (
                      <div className="text-xs text-destructive mt-1 truncate">
                        {job.errorMessage}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {job.status === "processing" && (
                      <button
                        onClick={() => void handlePause(job.id)}
                        className="p-2 rounded hover:bg-accent transition-colors"
                        title="暂停"
                      >
                        <Pause size={16} />
                      </button>
                    )}
                    {job.status === "paused" && (
                      <button
                        onClick={() => void handleResume(job.id, String(job.type))}
                        className="p-2 rounded hover:bg-accent transition-colors"
                        title="继续"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    {["pending", "processing", "paused"].includes(String(job.status)) && (
                      <button
                        onClick={() => void handleCancel(job.id)}
                        className="p-2 rounded hover:bg-destructive/20 text-destructive transition-colors"
                        title="取消"
                      >
                        <Square size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">检索（FTS5）</div>
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Search size={16} />
              <span className="text-sm">搜索</span>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词 / FTS 查询..."
              className="flex-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {results.length > 0 && (
            <div className="mt-4 space-y-2">
              {results.map((r) => (
                <div key={r.chunkId} className="rounded border border-border p-3">
                  <div className="text-sm">
                    <span className="font-medium">{r.documentTitle}</span>{" "}
                    <span className="text-xs text-muted-foreground">({r.documentKind})</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {r.snippet}
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.length === 0 && query.trim() && (
            <div className="mt-3 text-sm text-muted-foreground">无结果</div>
          )}
        </div>

        {/* Vector */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">向量索引（LanceDB）</div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBuildVectorIndex}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Wand2 size={16} />
                <span className="text-sm">构建/增量更新</span>
              </button>
              <button
                onClick={handleRebuildVectorIndex}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-destructive/20 text-destructive transition-colors"
              >
                <Trash2 size={16} />
                <span className="text-sm">重建</span>
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted-foreground">Embedding Provider</div>
              <select
                value={embeddingProviderId}
                onChange={(e) => setEmbeddingProviderId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {providers.filter((p) => p.enabled).length === 0 ? (
                  <option value="" disabled>
                    无可用提供商（请先在设置中启用并配置 API Key）
                  </option>
                ) : (
                  providers
                    .filter((p) => p.enabled)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Embedding Model</div>
              <input
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                placeholder="例如：text-embedding-3-small"
                className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            {vectorConfig ? (
              <>
                已配置：{vectorConfig.providerId} · {vectorConfig.model} · dim{" "}
                {vectorConfig.dimension}· 更新 {formatDate(vectorConfig.updatedAt)}
              </>
            ) : (
              "未检测到向量索引配置（请先构建）"
            )}
          </div>
        </div>

        {/* Semantic Search */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">语义检索（向量）</div>
            <button
              onClick={handleSemanticSearch}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Search size={16} />
              <span className="text-sm">搜索</span>
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <input
              value={semanticQuery}
              onChange={(e) => setSemanticQuery(e.target.value)}
              placeholder="输入语义检索文本..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">TopK</span>
              <input
                type="number"
                min={1}
                max={50}
                value={semanticTopK}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setSemanticTopK(Math.min(50, Math.max(1, n)));
                }}
                className="w-24 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          {semanticResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {semanticResults.map((r) => (
                <div key={r.chunkId} className="rounded border border-border p-3">
                  <div className="text-sm">
                    <span className="font-medium">{r.documentTitle}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {r.distance === null ? "" : `distance ${r.distance.toFixed(4)}`}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {r.content}
                  </div>
                </div>
              ))}
            </div>
          )}
          {semanticResults.length === 0 && semanticQuery.trim() && (
            <div className="mt-3 text-sm text-muted-foreground">无结果</div>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-medium">新建笔记</div>
          <div className="mt-3 space-y-2">
            <input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="标题"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="内容（支持 Markdown，保存后会被索引）"
              className="w-full min-h-[140px] px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center justify-end">
              <button
                onClick={handleCreateNote}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                保存并索引
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

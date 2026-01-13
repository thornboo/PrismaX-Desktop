import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isIpcCancelled } from "@/lib/ipc";
import type {
  KnowledgeBaseType,
  KnowledgeDocument,
  KnowledgeJob,
  KnowledgeVectorConfig,
  Provider,
  SearchResult,
  SemanticResult,
} from "./types";
import { KnowledgeBaseDocumentsCard } from "./components/KnowledgeBaseDocumentsCard";
import { KnowledgeBaseFtsSearchCard } from "./components/KnowledgeBaseFtsSearchCard";
import { KnowledgeBaseHeader } from "./components/KnowledgeBaseHeader";
import { KnowledgeBaseImportCard } from "./components/KnowledgeBaseImportCard";
import { KnowledgeBaseJobsCard } from "./components/KnowledgeBaseJobsCard";
import { KnowledgeBaseNotesCard } from "./components/KnowledgeBaseNotesCard";
import { KnowledgeBaseOverviewCard } from "./components/KnowledgeBaseOverviewCard";
import { KnowledgeBaseSemanticSearchCard } from "./components/KnowledgeBaseSemanticSearchCard";
import { KnowledgeBaseVectorIndexCard } from "./components/KnowledgeBaseVectorIndexCard";

export function KnowledgeBasePage() {
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

  const activeJobsCount = useMemo(() => {
    return jobs.filter((j) => ["pending", "processing", "paused"].includes(String(j.status)))
      .length;
  }, [jobs]);

  const loadAll = async () => {
    if (!kbIdSafe) return;
    setBusy(true);
    try {
      const basesRes = await window.electron.knowledge.listBases();
      if (!basesRes.success) {
        console.error("加载知识库失败:", basesRes.error);
        return;
      }
      const found = basesRes.data.find((b) => b.id === kbIdSafe) ?? null;
      setKb(found);

      const providersRes = await window.electron.provider.getAll();
      if (providersRes.success) setProviders(providersRes.data);
      else console.error("加载提供商失败:", providersRes.error);

      const jobsRes = await window.electron.knowledge.listJobs(kbIdSafe);
      if (jobsRes.success) setJobs(jobsRes.data);
      else console.error("加载任务失败:", jobsRes.error);

      const documentsRes = await window.electron.knowledge.listDocuments({
        kbId: kbIdSafe,
        limit: 200,
      });
      if (documentsRes.success) setDocuments(documentsRes.data);
      else console.error("加载文档失败:", documentsRes.error);

      const statsRes = await window.electron.knowledge.getStats(kbIdSafe);
      if (statsRes.success) setStats(statsRes.data);
      else console.error("加载统计失败:", statsRes.error);

      const vectorConfigRes = await window.electron.knowledge.getVectorConfig(kbIdSafe);
      if (vectorConfigRes.success) setVectorConfig(vectorConfigRes.data.config);
      else console.error("加载向量配置失败:", vectorConfigRes.error);
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
    const res = await window.electron.system.openPath(kb.dir);
    if (!res.success) alert(res.error);
  };

  const handleImportFiles = async () => {
    if (!kbIdSafe) return;
    const filePathsRes = await window.electron.knowledge.selectFiles();
    if (!filePathsRes.success) {
      if (isIpcCancelled(filePathsRes)) return;
      alert(filePathsRes.error);
      return;
    }
    const filePaths = filePathsRes.data;
    if (filePaths.length === 0) return;

    const importRes = await window.electron.knowledge.importFiles({
      kbId: kbIdSafe,
      sources: [{ type: "files", paths: filePaths }],
    });
    if (!importRes.success) {
      alert(importRes.error);
      return;
    }
    await loadAll();
  };

  const handleImportDirectory = async () => {
    if (!kbIdSafe) return;
    const dirRes = await window.electron.system.selectDirectory();
    if (!dirRes.success) {
      if (isIpcCancelled(dirRes)) return;
      alert(dirRes.error);
      return;
    }
    const importRes = await window.electron.knowledge.importFiles({
      kbId: kbIdSafe,
      sources: [{ type: "directory", paths: [dirRes.data] }],
    });
    if (!importRes.success) {
      alert(importRes.error);
      return;
    }
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
    if (!res.success) {
      alert(res.error);
      return;
    }
    setResults(res.data.results);
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
    if (!res.success) {
      alert(res.error);
      return;
    }
    setSemanticResults(res.data.results);
  };

  const handleBuildVectorIndex = async () => {
    if (!kbIdSafe) return;
    if (!embeddingProviderId) {
      alert("请先选择并启用一个提供商");
      return;
    }
    const res = await window.electron.knowledge.buildVectorIndex({
      kbId: kbIdSafe,
      providerId: embeddingProviderId,
      model: embeddingModel.trim(),
    });
    if (!res.success) {
      alert(res.error);
      return;
    }
    await loadAll();
  };

  const handleRebuildVectorIndex = async () => {
    if (!kbIdSafe) return;
    const confirmed = confirm(
      "⚠️ 危险操作：将删除该知识库的向量索引（派生数据）并清空索引状态，之后需要重新构建。是否继续？",
    );
    if (!confirmed) return;
    const res = await window.electron.knowledge.rebuildVectorIndex({
      kbId: kbIdSafe,
      confirmed: true,
    });
    if (!res.success) {
      alert(res.error);
      return;
    }
    setSemanticResults([]);
    await loadAll();
  };

  const handleCreateNote = async () => {
    if (!kbIdSafe) return;
    if (!noteTitle.trim()) {
      alert("请输入笔记标题");
      return;
    }
    const res = await window.electron.knowledge.createNote({
      kbId: kbIdSafe,
      title: noteTitle.trim(),
      content: noteContent,
    });
    if (!res.success) {
      alert(res.error);
      return;
    }
    setNoteTitle("");
    setNoteContent("");
    await loadAll();
  };

  const handleDeleteBase = async () => {
    if (!kbIdSafe) return;
    const confirmed = confirm("⚠️ 危险操作：确定要删除该知识库及其所有文件吗？此操作不可恢复。");
    if (!confirmed) return;
    const res = await window.electron.knowledge.deleteBase({ kbId: kbIdSafe, confirmed: true });
    if (!res.success) {
      alert(res.error);
      return;
    }
    navigate("/knowledge");
  };

  const handleDeleteDocument = async (documentId: string) => {
    const confirmed = confirm("⚠️ 危险操作：确定要从知识库删除该文档吗？相关索引也会被删除。");
    if (!confirmed) return;
    const res = await window.electron.knowledge.deleteDocument({
      kbId: kbIdSafe,
      documentId,
      confirmed: true,
    });
    if (!res.success) {
      alert(res.error);
      return;
    }
    await loadAll();
  };

  const handlePause = async (jobId: string) => {
    const res = await window.electron.knowledge.pauseJob({ kbId: kbIdSafe, jobId });
    if (!res.success) {
      alert(res.error);
      return;
    }
    await loadAll();
  };

  const handleResume = async (jobId: string, jobType: string) => {
    if (jobType === "build_vectors") {
      if (!embeddingProviderId) {
        alert("请先选择并启用一个提供商");
        return;
      }
      const res = await window.electron.knowledge.resumeVectorIndex({
        kbId: kbIdSafe,
        jobId,
        providerId: embeddingProviderId,
        model: embeddingModel.trim(),
      });
      if (!res.success) {
        alert(res.error);
        return;
      }
    } else {
      const res = await window.electron.knowledge.resumeJob({ kbId: kbIdSafe, jobId });
      if (!res.success) {
        alert(res.error);
        return;
      }
    }
    await loadAll();
  };

  const handleCancel = async (jobId: string) => {
    const confirmed = confirm("⚠️ 危险操作：确定要取消该导入任务吗？未处理项将被标记为跳过。");
    if (!confirmed) return;
    const res = await window.electron.knowledge.cancelJob({ kbId: kbIdSafe, jobId });
    if (!res.success) {
      alert(res.error);
      return;
    }
    await loadAll();
  };

  return (
    <div className="flex flex-col h-full">
      <KnowledgeBaseHeader
        name={kb?.name ?? "知识库"}
        description={kb?.description ?? "—"}
        onOpenDir={() => void handleOpenDir()}
        onDeleteBase={() => void handleDeleteBase()}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <KnowledgeBaseOverviewCard busy={busy} stats={stats} />

        <KnowledgeBaseImportCard
          activeJobsCount={activeJobsCount}
          onImportFiles={() => void handleImportFiles()}
          onImportDirectory={() => void handleImportDirectory()}
        />

        <KnowledgeBaseDocumentsCard
          documents={documents}
          onDeleteDocument={(id) => void handleDeleteDocument(id)}
        />

        <KnowledgeBaseJobsCard
          jobs={jobs}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
        />

        <KnowledgeBaseFtsSearchCard
          query={query}
          results={results}
          onQueryChange={setQuery}
          onSearch={() => void handleSearch()}
        />

        <KnowledgeBaseVectorIndexCard
          providers={providers}
          embeddingProviderId={embeddingProviderId}
          embeddingModel={embeddingModel}
          vectorConfig={vectorConfig}
          onEmbeddingProviderIdChange={setEmbeddingProviderId}
          onEmbeddingModelChange={setEmbeddingModel}
          onBuild={() => void handleBuildVectorIndex()}
          onRebuild={() => void handleRebuildVectorIndex()}
        />

        <KnowledgeBaseSemanticSearchCard
          query={semanticQuery}
          topK={semanticTopK}
          results={semanticResults}
          onQueryChange={setSemanticQuery}
          onTopKChange={setSemanticTopK}
          onSearch={() => void handleSemanticSearch()}
        />

        <KnowledgeBaseNotesCard
          title={noteTitle}
          content={noteContent}
          onTitleChange={setNoteTitle}
          onContentChange={setNoteContent}
          onCreate={() => void handleCreateNote()}
        />
      </div>
    </div>
  );
}

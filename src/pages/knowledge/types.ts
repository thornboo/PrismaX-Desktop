export type KnowledgeBaseType = Awaited<
  ReturnType<typeof window.electron.knowledge.listBases>
>[number];
export type KnowledgeJob = Awaited<ReturnType<typeof window.electron.knowledge.listJobs>>[number];
export type SearchResult = Awaited<
  ReturnType<typeof window.electron.knowledge.search>
>["results"][number];
export type KnowledgeDocument = Awaited<
  ReturnType<typeof window.electron.knowledge.listDocuments>
>[number];
export type Provider = Awaited<ReturnType<typeof window.electron.provider.getAll>>[number];
export type KnowledgeVectorConfig = Awaited<
  ReturnType<typeof window.electron.knowledge.getVectorConfig>
>["config"];
export type SemanticResult = Awaited<
  ReturnType<typeof window.electron.knowledge.semanticSearch>
>["results"][number];

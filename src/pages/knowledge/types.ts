import type {
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeJob,
  KnowledgeSearchResult,
  KnowledgeVectorConfig as KnowledgeVectorConfigSchema,
  KnowledgeVectorSearchResult,
  Provider,
} from "@/types/electron.d";

export type KnowledgeBaseType = KnowledgeBase;
export type SearchResult = KnowledgeSearchResult;
export type SemanticResult = KnowledgeVectorSearchResult;
export type KnowledgeVectorConfig = KnowledgeVectorConfigSchema | null;

export type { KnowledgeDocument, KnowledgeJob, Provider };

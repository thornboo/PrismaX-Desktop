export type KnowledgeMetaMigration = {
  id: number;
  name: string;
  sql: string;
};

export const KNOWLEDGE_META_MIGRATIONS: KnowledgeMetaMigration[] = [
  {
    id: 1,
    name: "init",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('file', 'note')),
        title TEXT NOT NULL,
        source_path TEXT,
        blob_rel_path TEXT,
        mime_type TEXT,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        sha256 TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_documents_kind ON documents(kind);
      CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);

      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        content,
        content='chunks',
        content_rowid='rowid',
        tokenize='unicode61 remove_diacritics 2'
      );

      CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
        INSERT INTO chunks_fts(rowid, content) VALUES (new.rowid, new.content);
      END;
      CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
        INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
      END;
      CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
        INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
        INSERT INTO chunks_fts(rowid, content) VALUES (new.rowid, new.content);
      END;

      CREATE TABLE IF NOT EXISTS notes (
        document_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
        content TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        progress_current INTEGER NOT NULL DEFAULT 0,
        progress_total INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        finished_at INTEGER,
        updated_at INTEGER NOT NULL,
        heartbeat_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at);
    `,
  },
  {
    id: 2,
    name: "job_items",
    sql: `
      CREATE TABLE IF NOT EXISTS job_items (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('file')),
        source_path TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'done', 'failed', 'skipped')),
        error_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        started_at INTEGER,
        finished_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_job_items_job_id ON job_items(job_id);
      CREATE INDEX IF NOT EXISTS idx_job_items_status ON job_items(status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_job_items_job_source_path ON job_items(job_id, source_path);
    `,
  },
  {
    id: 3,
    name: "blobs_and_fingerprints",
    sql: `
      CREATE TABLE IF NOT EXISTS blobs (
        sha256 TEXT PRIMARY KEY,
        rel_path TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        mime_type TEXT,
        created_at INTEGER NOT NULL,
        ref_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_blobs_ref_count ON blobs(ref_count);

      CREATE TABLE IF NOT EXISTS file_fingerprints (
        source_path TEXT PRIMARY KEY,
        size_bytes INTEGER NOT NULL,
        mtime_ms INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_file_fingerprints_sha256 ON file_fingerprints(sha256);

      ALTER TABLE documents ADD COLUMN blob_sha256 TEXT;
      ALTER TABLE documents ADD COLUMN source_mtime_ms INTEGER;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_unique_source_path
      ON documents(source_path)
      WHERE kind = 'file' AND source_path IS NOT NULL;
    `,
  },
  {
    id: 4,
    name: "vector_index_state",
    sql: `
      CREATE TABLE IF NOT EXISTS vector_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        provider_id TEXT NOT NULL,
        model TEXT NOT NULL,
        dimension INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chunk_vectors (
        chunk_id TEXT PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
        config_hash TEXT NOT NULL,
        indexed_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chunk_vectors_config_hash ON chunk_vectors(config_hash);
    `,
  },
];

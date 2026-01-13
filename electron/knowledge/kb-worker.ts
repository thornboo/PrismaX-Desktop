import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { once } from "node:events";
import { StringDecoder } from "node:string_decoder";
import { openKnowledgeMetaDb } from "./meta-db";
import type { KnowledgeMetaDb } from "./meta-db";
import {
  embedTextsOpenAICompatible,
  type OpenAICompatibleEmbeddingConfig,
} from "./embeddings/openai-compatible";
import {
  createLanceVectorStore,
  upsertVectorsById,
  vectorSearch,
  type LanceVectorRecord,
} from "./vector/lancedb-store";
import {
  getKnowledgeBaseBlobsDirFromUserData,
  getKnowledgeBaseDirFromUserData,
  getKnowledgeBaseIndexDirFromUserData,
  getKnowledgeBaseManifestPathFromUserData,
  getKnowledgeBaseStagingDirFromUserData,
  getKnowledgeMetaDbPathFromUserData,
} from "./paths-node";
import type {
  KnowledgeWorkerEvent,
  KnowledgeWorkerRequest,
  KnowledgeWorkerResponse,
} from "./worker-protocol";

type JobStatus = "pending" | "processing" | "paused" | "done" | "failed" | "canceled";
type JobItemStatus = "pending" | "processing" | "done" | "failed" | "skipped";

type ImportSource =
  | { type: "files"; paths: string[] }
  | { type: "directory"; paths: string[]; recursive?: boolean };

type ImportJobPayload = {
  sources: ImportSource[];
};

type SearchResult = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentKind: "file" | "note";
  snippet: string;
  score: number;
};

type VectorBuildMode = "incremental" | "rebuild";

type VectorConfig = {
  providerId: string;
  model: string;
  dimension: number;
  updatedAt: number;
};

type VectorSearchResult = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  distance: number | null;
};

const USER_DATA_PATH = process.env.PRISMAX_USER_DATA;
if (!USER_DATA_PATH) {
  throw new Error("缺少环境变量 PRISMAX_USER_DATA");
}

const dbCache = new Map<string, KnowledgeMetaDb>();
const runningByKb = new Map<string, string>(); // kbId -> jobId
const inMemoryCanceledJobs = new Set<string>(); // jobId（用于尽快停止）
const vectorJobEmbeddingConfig = new Map<string, OpenAICompatibleEmbeddingConfig>(); // jobId -> config
const runningVectorByKb = new Map<string, string>(); // kbId -> jobId（向量索引任务）

function sendEvent(event: string, payload: unknown): void {
  const msg: KnowledgeWorkerEvent = { type: "event", event, payload };
  if (typeof process.send === "function") {
    process.send(msg);
  }
}

function respondOk(id: string, result: unknown): void {
  const msg: KnowledgeWorkerResponse = { id, ok: true, result };
  if (typeof process.send === "function") {
    process.send(msg);
  }
}

function respondError(id: string, error: unknown): void {
  const message = error instanceof Error ? error.message : "未知错误";
  const stack = error instanceof Error ? error.stack : undefined;
  const msg: KnowledgeWorkerResponse = { id, ok: false, error: { message, stack } };
  if (typeof process.send === "function") {
    process.send(msg);
  }
}

function ensureKbDirs(kbId: string): void {
  const kbDir = getKnowledgeBaseDirFromUserData(USER_DATA_PATH, kbId);
  fs.mkdirSync(kbDir, { recursive: true });
  fs.mkdirSync(getKnowledgeBaseBlobsDirFromUserData(USER_DATA_PATH, kbId), { recursive: true });
  fs.mkdirSync(getKnowledgeBaseIndexDirFromUserData(USER_DATA_PATH, kbId), { recursive: true });
  fs.mkdirSync(getKnowledgeBaseStagingDirFromUserData(USER_DATA_PATH, kbId), { recursive: true });

  const manifestPath = getKnowledgeBaseManifestPathFromUserData(USER_DATA_PATH, kbId);
  if (!fs.existsSync(manifestPath)) {
    const now = Date.now();
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          id: kbId,
          name: "未命名知识库",
          description: null,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        null,
        2,
      ),
    );
  }
}

function getDb(kbId: string): KnowledgeMetaDb {
  const cached = dbCache.get(kbId);
  if (cached) return cached;

  ensureKbDirs(kbId);
  const dbPath = getKnowledgeMetaDbPathFromUserData(USER_DATA_PATH, kbId);
  const sqlite = openKnowledgeMetaDb(dbPath);

  // 启动恢复：将上次崩溃遗留的 processing 状态归位为 paused/pending
  const now = Date.now();
  sqlite
    .prepare("UPDATE jobs SET status = 'paused', updated_at = ? WHERE status = 'processing'")
    .run(now);
  sqlite
    .prepare("UPDATE job_items SET status = 'pending', updated_at = ? WHERE status = 'processing'")
    .run(now);

  dbCache.set(kbId, sqlite);
  return sqlite;
}

function isSupportedTextExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const textExts = new Set([
    ".txt",
    ".md",
    ".markdown",
    ".mdx",
    ".json",
    ".jsonl",
    ".yaml",
    ".yml",
    ".csv",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".kts",
    ".rb",
    ".php",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".xml",
    ".toml",
    ".ini",
    ".sh",
    ".bash",
    ".zsh",
    ".sql",
  ]);
  return textExts.has(ext);
}

function guessMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".markdown": "text/markdown",
    ".json": "application/json",
    ".csv": "text/csv",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
  };
  return map[ext] ?? null;
}

async function collectFilesFromDirectory(dir: string, recursive: boolean): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [dir];

  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      // 规避常见噪音目录
      if (
        entry.isDirectory() &&
        ["node_modules", ".git", ".idea", ".vscode"].includes(entry.name)
      ) {
        continue;
      }

      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (recursive) stack.push(full);
        continue;
      }
      if (entry.isFile()) out.push(full);
    }
  }

  return out;
}

async function resolveImportFileList(sources: ImportSource[]): Promise<string[]> {
  const files: string[] = [];
  for (const source of sources) {
    if (source.type === "files") {
      files.push(...source.paths);
      continue;
    }
    if (source.type === "directory") {
      for (const dir of source.paths) {
        const collected = await collectFilesFromDirectory(dir, source.recursive ?? true);
        files.push(...collected);
      }
    }
  }
  // 去重 + 保序
  return [...new Set(files)];
}

function getBlobRelPathFromSha256(sha256: string): string {
  const a = sha256.slice(0, 2);
  const b = sha256.slice(2, 4);
  return path.join("blobs", "sha256", a, b, sha256);
}

function getBlobAbsPathFromSha256(kbId: string, sha256: string): string {
  return path.join(
    getKnowledgeBaseDirFromUserData(USER_DATA_PATH, kbId),
    getBlobRelPathFromSha256(sha256),
  );
}

function blobExists(kbId: string, sha256: string): boolean {
  try {
    return fs.existsSync(getBlobAbsPathFromSha256(kbId, sha256));
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getVectorStoreDir(kbId: string): string {
  return path.join(getKnowledgeBaseIndexDirFromUserData(USER_DATA_PATH, kbId), "vector", "lancedb");
}

function computeVectorConfigHash(input: {
  providerId: string;
  model: string;
  dimension: number;
}): string {
  return `${input.providerId}::${input.model}::${input.dimension}`;
}

function getVectorConfigRow(db: KnowledgeMetaDb): VectorConfig | null {
  const row = db
    .prepare(
      "SELECT provider_id AS providerId, model, dimension, updated_at AS updatedAt FROM vector_config WHERE id = 1",
    )
    .get() as
    | { providerId: string; model: string; dimension: number; updatedAt: number }
    | undefined;
  if (!row) return null;
  return {
    providerId: String(row.providerId),
    model: String(row.model),
    dimension: Number(row.dimension),
    updatedAt: Number(row.updatedAt),
  };
}

function upsertVectorConfigRow(
  db: KnowledgeMetaDb,
  config: { providerId: string; model: string; dimension: number },
): VectorConfig {
  const now = Date.now();
  db.prepare(
    `
    INSERT INTO vector_config(id, provider_id, model, dimension, updated_at)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      provider_id = excluded.provider_id,
      model = excluded.model,
      dimension = excluded.dimension,
      updated_at = excluded.updated_at
  `,
  ).run(config.providerId, config.model, config.dimension, now);
  return { ...config, updatedAt: now };
}

function chunkTextStream(
  chunkSize: number,
  overlap: number,
): {
  push: (text: string) => string[];
  flush: () => string | null;
} {
  let carry = "";
  return {
    push: (text: string) => {
      carry += text;
      const chunks: string[] = [];
      while (carry.length >= chunkSize) {
        const part = carry.slice(0, chunkSize);
        chunks.push(part);
        carry = carry.slice(Math.max(0, chunkSize - overlap));
      }
      return chunks;
    },
    flush: () => {
      const rest = carry.trim();
      carry = "";
      return rest.length > 0 ? rest : null;
    },
  };
}

function bufferLooksBinary(buf: Buffer): boolean {
  // 快速启发式：出现 0x00 基本可认为是二进制
  return buf.includes(0);
}

async function importOneFile(params: {
  kbId: string;
  jobId: string;
  jobItemId: string;
  sourcePath: string;
}): Promise<{ status: JobItemStatus; documentId?: string; error?: string }> {
  const { kbId, sourcePath, jobItemId } = params;
  const db = getDb(kbId);

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(sourcePath);
  } catch {
    return { status: "failed", error: "文件不存在或无法读取" };
  }
  if (!stat.isFile()) {
    return { status: "skipped", error: "非文件" };
  }

  const now = Date.now();
  const title = path.basename(sourcePath);
  const mimeType = guessMimeType(sourcePath);
  const sourceMtimeMs = Math.floor(stat.mtimeMs);

  const existingFingerprint = db
    .prepare(
      "SELECT size_bytes AS sizeBytes, mtime_ms AS mtimeMs, sha256 FROM file_fingerprints WHERE source_path = ?",
    )
    .get(sourcePath) as { sizeBytes: number; mtimeMs: number; sha256: string } | undefined;

  const existingDocument = db
    .prepare(
      "SELECT id, sha256, blob_sha256 AS blobSha256 FROM documents WHERE kind = 'file' AND source_path = ? LIMIT 1",
    )
    .get(sourcePath) as
    | { id: string; sha256: string | null; blobSha256: string | null }
    | undefined;

  const knownSha =
    existingFingerprint &&
    Number(existingFingerprint.sizeBytes) === stat.size &&
    Number(existingFingerprint.mtimeMs) === sourceMtimeMs
      ? existingFingerprint.sha256
      : null;

  if (
    knownSha &&
    existingDocument &&
    (existingDocument.blobSha256 ?? existingDocument.sha256) === knownSha
  ) {
    if (blobExists(kbId, knownSha)) {
      return { status: "skipped", documentId: existingDocument.id };
    }
  }

  const documentId = existingDocument?.id ?? crypto.randomUUID();
  const previousSha = existingDocument?.blobSha256 ?? existingDocument?.sha256 ?? null;

  const insertDoc = db.prepare(
    `INSERT INTO documents(
        id, kind, title, source_path, blob_rel_path, mime_type, size_bytes, sha256, created_at, updated_at, blob_sha256, source_mtime_ms
      ) VALUES (
        ?, 'file', ?, ?, NULL, ?, ?, NULL, ?, ?, NULL, ?
      )`,
  );
  const updateDocBase = db.prepare(
    "UPDATE documents SET title = ?, mime_type = ?, size_bytes = ?, source_mtime_ms = ?, updated_at = ? WHERE id = ?",
  );
  const deleteChunksForDoc = db.prepare("DELETE FROM chunks WHERE document_id = ?");
  const insertChunk = db.prepare(
    "INSERT INTO chunks(id, document_id, chunk_index, content, created_at) VALUES (?, ?, ?, ?, ?)",
  );

  const updateDocAfterBlob = db.prepare(
    "UPDATE documents SET sha256 = ?, blob_sha256 = ?, blob_rel_path = ?, updated_at = ? WHERE id = ?",
  );
  const upsertFingerprint = db.prepare(
    `
    INSERT INTO file_fingerprints(source_path, size_bytes, mtime_ms, sha256, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(source_path) DO UPDATE SET
      size_bytes = excluded.size_bytes,
      mtime_ms = excluded.mtime_ms,
      sha256 = excluded.sha256,
      updated_at = excluded.updated_at
  `,
  );

  const upsertBlobIncrement = db.prepare(
    `
    INSERT INTO blobs(sha256, rel_path, size_bytes, mime_type, created_at, ref_count)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(sha256) DO UPDATE SET
      ref_count = blobs.ref_count + 1,
      size_bytes = excluded.size_bytes,
      mime_type = COALESCE(excluded.mime_type, blobs.mime_type)
  `,
  );
  const decrementBlob = db.prepare("UPDATE blobs SET ref_count = ref_count - 1 WHERE sha256 = ?");
  const getBlobRow = db.prepare(
    "SELECT sha256, rel_path AS relPath, ref_count AS refCount FROM blobs WHERE sha256 = ?",
  );
  const deleteBlobRow = db.prepare("DELETE FROM blobs WHERE sha256 = ? AND ref_count <= 0");

  const shouldIndexText = isSupportedTextExtension(sourcePath);

  const kbDir = getKnowledgeBaseDirFromUserData(USER_DATA_PATH, kbId);
  const stagingDir = getKnowledgeBaseStagingDirFromUserData(USER_DATA_PATH, kbId);
  fs.mkdirSync(stagingDir, { recursive: true });
  const stagingTempPath = path.join(stagingDir, `${crypto.randomUUID()}.tmp`);
  let createdBlobAbsPath: string | null = null;
  let didCreateBlobFile = false;

  // 手动事务：需要与 stream async/await 配合
  db.exec("BEGIN");
  try {
    if (!existingDocument) {
      insertDoc.run(documentId, title, sourcePath, mimeType, stat.size, now, now, sourceMtimeMs);
    } else {
      updateDocBase.run(title, mimeType, stat.size, sourceMtimeMs, now, documentId);
    }

    deleteChunksForDoc.run(documentId);

    const hash = crypto.createHash("sha256");
    const reader = fs.createReadStream(sourcePath);
    const writer = fs.createWriteStream(stagingTempPath, { flags: "wx" });

    const decoder = new StringDecoder("utf8");
    const chunker = chunkTextStream(2000, 200);
    let chunkIndex = 0;
    let decidedBinary = false;
    let canIndex = shouldIndexText;

    for await (const buf of reader) {
      const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as any);
      hash.update(buffer);

      if (!writer.write(buffer)) {
        await once(writer, "drain");
      }

      if (!canIndex) continue;

      if (!decidedBinary) {
        decidedBinary = true;
        if (bufferLooksBinary(buffer)) {
          canIndex = false;
          continue;
        }
      }

      const text = decoder.write(buffer);
      const parts = chunker.push(text);
      for (const part of parts) {
        insertChunk.run(crypto.randomUUID(), documentId, chunkIndex++, part, Date.now());
      }
    }

    const tail = decoder.end();
    if (canIndex) {
      const parts = chunker.push(tail);
      for (const part of parts) {
        insertChunk.run(crypto.randomUUID(), documentId, chunkIndex++, part, Date.now());
      }
      const rest = chunker.flush();
      if (rest) {
        insertChunk.run(crypto.randomUUID(), documentId, chunkIndex++, rest, Date.now());
      }
    }

    writer.end();
    await once(writer, "close");

    const sha256 = hash.digest("hex");
    const blobRelPath = getBlobRelPathFromSha256(sha256);
    const blobAbsPath = path.join(kbDir, blobRelPath);
    fs.mkdirSync(path.dirname(blobAbsPath), { recursive: true });

    const existedBefore = fs.existsSync(blobAbsPath);
    if (existedBefore) {
      await fs.promises.rm(stagingTempPath, { force: true });
    } else {
      await fs.promises.rename(stagingTempPath, blobAbsPath);
      createdBlobAbsPath = blobAbsPath;
      didCreateBlobFile = true;
    }

    const updatedAt = Date.now();
    updateDocAfterBlob.run(sha256, sha256, blobRelPath, updatedAt, documentId);
    upsertFingerprint.run(sourcePath, stat.size, sourceMtimeMs, sha256, updatedAt);

    const shouldIncrementBlob = !previousSha || previousSha !== sha256;
    if (shouldIncrementBlob) {
      upsertBlobIncrement.run(sha256, blobRelPath, stat.size, mimeType, updatedAt);
    }

    if (previousSha && previousSha !== sha256) {
      decrementBlob.run(previousSha);
      const row = getBlobRow.get(previousSha) as
        | { sha256: string; relPath: string; refCount: number }
        | undefined;
      deleteBlobRow.run(previousSha);
      const stillThere = getBlobRow.get(previousSha);
      if (!stillThere && row?.relPath) {
        try {
          await fs.promises.rm(path.join(kbDir, row.relPath), { force: true });
        } catch {
          // ignore
        }
      }
    }

    db.exec("COMMIT");
    return { status: "done", documentId };
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore
    }
    if (didCreateBlobFile && createdBlobAbsPath) {
      try {
        await fs.promises.rm(createdBlobAbsPath, { force: true });
      } catch {
        // ignore
      }
    }
    // 尽量清理未完成 staging 文件
    try {
      await fs.promises.rm(stagingTempPath, { force: true });
    } catch {
      // ignore
    }
    const message = error instanceof Error ? error.message : "导入失败";
    return { status: "failed", error: message };
  } finally {
    // 更新 job_item 状态（无论成功失败）
    const now2 = Date.now();
    db.prepare("UPDATE job_items SET updated_at = ? WHERE id = ?").run(now2, jobItemId);
  }
}

function jobSummary(db: KnowledgeMetaDb, jobId: string): any {
  const row = db
    .prepare(
      `
      SELECT
        id, type, status, progress_current AS progressCurrent, progress_total AS progressTotal,
        error_message AS errorMessage,
        created_at AS createdAt, started_at AS startedAt, finished_at AS finishedAt,
        updated_at AS updatedAt, heartbeat_at AS heartbeatAt
      FROM jobs
      WHERE id = ?
    `,
    )
    .get(jobId);
  return row ?? null;
}

/**
 * 队列策略（KISS）：同一知识库同一时间只允许一个"未结束任务"（pending/processing/paused）。
 * 如果存在 paused 任务，则不自动启动其他 pending，避免并发让用户困惑。
 */
function scheduleNextPendingJob(kbId: string, db: KnowledgeMetaDb): void {
  const hasPaused = db.prepare("SELECT 1 AS ok FROM jobs WHERE status = 'paused' LIMIT 1").get() as
    | { ok: 1 }
    | undefined;
  if (hasPaused) {
    return;
  }

  const next = db
    .prepare(
      `
      SELECT id
      FROM jobs
      WHERE type = 'import_files' AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
    `,
    )
    .get() as { id: string } | undefined;
  if (next?.id) {
    void processImportJob(kbId, next.id);
  }
}

async function processImportJob(kbId: string, jobId: string): Promise<void> {
  const db = getDb(kbId);
  if (runningByKb.get(kbId) && runningByKb.get(kbId) !== jobId) {
    return;
  }
  runningByKb.set(kbId, jobId);

  const now = Date.now();
  db.prepare(
    "UPDATE jobs SET status = 'processing', started_at = COALESCE(started_at, ?), updated_at = ?, heartbeat_at = ? WHERE id = ?",
  ).run(now, now, now, jobId);
  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });

  try {
    while (true) {
      if (inMemoryCanceledJobs.has(jobId)) {
        break;
      }

      const job = db.prepare("SELECT status FROM jobs WHERE id = ?").get(jobId) as
        | { status: JobStatus }
        | undefined;
      const status = job?.status;
      if (!status || status === "done" || status === "failed" || status === "canceled") {
        break;
      }
      if (status === "paused") {
        break;
      }

      const next = db
        .prepare(
          `
          SELECT id, source_path AS sourcePath
          FROM job_items
          WHERE job_id = ? AND status = 'pending'
          ORDER BY created_at ASC
          LIMIT 1
        `,
        )
        .get(jobId) as { id: string; sourcePath: string } | undefined;

      if (!next) {
        db.prepare(
          "UPDATE jobs SET status = 'done', finished_at = ?, updated_at = ?, heartbeat_at = ? WHERE id = ?",
        ).run(Date.now(), Date.now(), Date.now(), jobId);
        sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
        break;
      }

      const itemNow = Date.now();
      db.prepare(
        "UPDATE job_items SET status = 'processing', started_at = ?, updated_at = ? WHERE id = ?",
      ).run(itemNow, itemNow, next.id);

      const result = await importOneFile({
        kbId,
        jobId,
        jobItemId: next.id,
        sourcePath: next.sourcePath,
      });

      const doneNow = Date.now();
      db.prepare(
        "UPDATE job_items SET status = ?, error_message = ?, finished_at = ?, updated_at = ? WHERE id = ?",
      ).run(result.status, result.error ?? null, doneNow, doneNow, next.id);

      const progress = db
        .prepare(
          "SELECT COUNT(*) AS doneCount FROM job_items WHERE job_id = ? AND status IN ('done', 'failed', 'skipped')",
        )
        .get(jobId) as { doneCount: number };

      db.prepare(
        "UPDATE jobs SET progress_current = ?, updated_at = ?, heartbeat_at = ? WHERE id = ?",
      ).run(Number(progress.doneCount ?? 0), doneNow, doneNow, jobId);

      sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "导入任务失败";
    const failNow = Date.now();
    db.prepare(
      "UPDATE jobs SET status = 'failed', error_message = ?, finished_at = ?, updated_at = ? WHERE id = ?",
    ).run(message, failNow, failNow, jobId);
    sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  } finally {
    runningByKb.delete(kbId);
    scheduleNextPendingJob(kbId, db);
  }
}

async function handleEnsureInitialized(params: any): Promise<{ kbId: string; metaDbPath: string }> {
  const kbId = String(params?.kbId ?? "");
  if (!kbId) throw new Error("kbId 不能为空");
  ensureKbDirs(kbId);
  const dbPath = getKnowledgeMetaDbPathFromUserData(USER_DATA_PATH, kbId);
  getDb(kbId); // migrate + recover
  return { kbId, metaDbPath: dbPath };
}

async function handleImportFiles(params: any): Promise<{ jobId: string }> {
  const kbId = String(params?.kbId ?? "");
  if (!kbId) throw new Error("kbId 不能为空");
  const sources = (params?.sources ?? []) as ImportSource[];
  if (!Array.isArray(sources) || sources.length === 0) throw new Error("sources 不能为空");

  ensureKbDirs(kbId);
  const db = getDb(kbId);

  const files = await resolveImportFileList(sources);
  if (files.length === 0) {
    throw new Error("未发现可导入的文件");
  }

  const jobId = crypto.randomUUID();
  const payload: ImportJobPayload = { sources };
  const now = Date.now();

  const insertJob = db.prepare(`
    INSERT INTO jobs(id, type, status, payload_json, progress_current, progress_total, error_message, created_at, started_at, finished_at, updated_at, heartbeat_at)
    VALUES (?, 'import_files', 'pending', ?, 0, ?, NULL, ?, NULL, NULL, ?, NULL)
  `);
  const insertItem = db.prepare(`
    INSERT INTO job_items(id, job_id, kind, source_path, status, error_message, created_at, updated_at, started_at, finished_at)
    VALUES (?, ?, 'file', ?, 'pending', NULL, ?, ?, NULL, NULL)
  `);

  db.exec("BEGIN");
  try {
    insertJob.run(jobId, JSON.stringify(payload), files.length, now, now);
    for (const sourcePath of files) {
      insertItem.run(crypto.randomUUID(), jobId, sourcePath, now, now);
    }
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  }

  // 如果该 KB 当前没有任务在跑，立即启动；否则保持 pending（后续可实现队列）
  if (!runningByKb.has(kbId)) {
    void processImportJob(kbId, jobId);
  }

  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  return { jobId };
}

async function handleListJobs(params: any): Promise<any[]> {
  const kbId = String(params?.kbId ?? "");
  if (!kbId) throw new Error("kbId 不能为空");
  const db = getDb(kbId);
  const rows = db
    .prepare(
      `
      SELECT
        id, type, status, progress_current AS progressCurrent, progress_total AS progressTotal,
        error_message AS errorMessage,
        created_at AS createdAt, started_at AS startedAt, finished_at AS finishedAt,
        updated_at AS updatedAt, heartbeat_at AS heartbeatAt
      FROM jobs
      ORDER BY created_at DESC
      LIMIT 200
    `,
    )
    .all();
  return rows as any[];
}

async function handlePauseJob(params: any): Promise<{ success: boolean }> {
  const kbId = String(params?.kbId ?? "");
  const jobId = String(params?.jobId ?? "");
  if (!kbId || !jobId) throw new Error("kbId/jobId 不能为空");
  const db = getDb(kbId);
  const now = Date.now();
  db.prepare(
    "UPDATE jobs SET status = 'paused', updated_at = ? WHERE id = ? AND status IN ('pending','processing')",
  ).run(now, jobId);
  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  return { success: true };
}

async function handleResumeJob(params: any): Promise<{ success: boolean }> {
  const kbId = String(params?.kbId ?? "");
  const jobId = String(params?.jobId ?? "");
  if (!kbId || !jobId) throw new Error("kbId/jobId 不能为空");
  const db = getDb(kbId);
  const now = Date.now();
  db.prepare(
    "UPDATE jobs SET status = 'pending', updated_at = ? WHERE id = ? AND status IN ('paused','pending')",
  ).run(now, jobId);
  if (!runningByKb.has(kbId)) {
    void processImportJob(kbId, jobId);
  }
  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  return { success: true };
}

async function handleCancelJob(params: any): Promise<{ success: boolean }> {
  const kbId = String(params?.kbId ?? "");
  const jobId = String(params?.jobId ?? "");
  if (!kbId || !jobId) throw new Error("kbId/jobId 不能为空");
  inMemoryCanceledJobs.add(jobId);
  const db = getDb(kbId);
  const now = Date.now();
  db.prepare(
    "UPDATE jobs SET status = 'canceled', finished_at = COALESCE(finished_at, ?), updated_at = ? WHERE id = ?",
  ).run(now, now, jobId);
  db.prepare(
    "UPDATE job_items SET status = 'skipped', updated_at = ? WHERE job_id = ? AND status IN ('pending','processing')",
  ).run(now, jobId);
  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  return { success: true };
}

async function handleSearch(params: any): Promise<{ results: SearchResult[] }> {
  const kbId = String(params?.kbId ?? "");
  const query = String(params?.query ?? "").trim();
  const limit = Number(params?.limit ?? 20);
  if (!kbId) throw new Error("kbId 不能为空");
  if (!query) return { results: [] };

  const db = getDb(kbId);

  // FTS5：bm25 越小越相关
  const rows = db
    .prepare(
      `
      SELECT
        c.id AS chunkId,
        c.document_id AS documentId,
        d.title AS documentTitle,
        d.kind AS documentKind,
        snippet(chunks_fts, 0, '[', ']', '...', 10) AS snippet,
        bm25(chunks_fts) AS score
      FROM chunks_fts
      JOIN chunks c ON chunks_fts.rowid = c.rowid
      JOIN documents d ON d.id = c.document_id
      WHERE chunks_fts MATCH ?
      ORDER BY score ASC
      LIMIT ?
    `,
    )
    .all(query, limit) as any[];

  return {
    results: rows.map((r) => ({
      chunkId: String(r.chunkId),
      documentId: String(r.documentId),
      documentTitle: String(r.documentTitle ?? ""),
      documentKind: r.documentKind === "note" ? "note" : "file",
      snippet: String(r.snippet ?? ""),
      score: Number(r.score ?? 0),
    })),
  };
}

async function handleCreateNote(params: any): Promise<{ documentId: string }> {
  const kbId = String(params?.kbId ?? "");
  const title = String(params?.title ?? "").trim();
  const content = String(params?.content ?? "");
  if (!kbId) throw new Error("kbId 不能为空");
  if (!title) throw new Error("title 不能为空");

  const db = getDb(kbId);
  const documentId = crypto.randomUUID();
  const now = Date.now();

  const insertDoc = db.prepare(
    `INSERT INTO documents(id, kind, title, source_path, blob_rel_path, mime_type, size_bytes, sha256, created_at, updated_at)
     VALUES (?, 'note', ?, NULL, NULL, 'text/markdown', ?, NULL, ?, ?)`,
  );
  const insertNote = db.prepare("INSERT INTO notes(document_id, content) VALUES (?, ?)");
  const insertChunk = db.prepare(
    "INSERT INTO chunks(id, document_id, chunk_index, content, created_at) VALUES (?, ?, ?, ?, ?)",
  );

  db.exec("BEGIN");
  try {
    insertDoc.run(documentId, title, Buffer.byteLength(content, "utf8"), now, now);
    insertNote.run(documentId, content);

    const chunker = chunkTextStream(2000, 200);
    let idx = 0;
    const parts = chunker.push(content);
    for (const part of parts) {
      insertChunk.run(crypto.randomUUID(), documentId, idx++, part, Date.now());
    }
    const rest = chunker.flush();
    if (rest) {
      insertChunk.run(crypto.randomUUID(), documentId, idx++, rest, Date.now());
    }

    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  }

  return { documentId };
}

async function handleGetStats(params: any): Promise<any> {
  const kbId = String(params?.kbId ?? "");
  if (!kbId) throw new Error("kbId 不能为空");
  const db = getDb(kbId);
  const doc = db.prepare("SELECT COUNT(*) AS n FROM documents").get() as { n: number };
  const chunks = db.prepare("SELECT COUNT(*) AS n FROM chunks").get() as { n: number };
  const jobs = db.prepare("SELECT COUNT(*) AS n FROM jobs").get() as { n: number };
  return {
    documents: Number(doc.n ?? 0),
    chunks: Number(chunks.n ?? 0),
    jobs: Number(jobs.n ?? 0),
  };
}

async function handleListDocuments(params: any): Promise<any[]> {
  const kbId = String(params?.kbId ?? "");
  const limit = Math.min(500, Math.max(1, Number(params?.limit ?? 200)));
  if (!kbId) throw new Error("kbId 不能为空");
  const db = getDb(kbId);
  const rows = db
    .prepare(
      `
      SELECT
        id,
        kind,
        title,
        source_path AS sourcePath,
        blob_sha256 AS blobSha256,
        blob_rel_path AS blobRelPath,
        mime_type AS mimeType,
        size_bytes AS sizeBytes,
        sha256,
        source_mtime_ms AS sourceMtimeMs,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM documents
      ORDER BY updated_at DESC
      LIMIT ?
    `,
    )
    .all(limit);
  return rows as any[];
}

async function handleDeleteDocument(params: any): Promise<{ success: boolean }> {
  const kbId = String(params?.kbId ?? "");
  const documentId = String(params?.documentId ?? "");
  const confirmed = Boolean(params?.confirmed);
  if (!kbId || !documentId) throw new Error("kbId/documentId 不能为空");
  if (!confirmed) throw new Error("危险操作：删除文档需要 confirmed=true");

  const db = getDb(kbId);
  const kbDir = getKnowledgeBaseDirFromUserData(USER_DATA_PATH, kbId);

  const doc = db
    .prepare(
      `
      SELECT
        id,
        kind,
        source_path AS sourcePath,
        COALESCE(blob_sha256, sha256) AS sha256,
        blob_rel_path AS blobRelPath
      FROM documents
      WHERE id = ?
    `,
    )
    .get(documentId) as
    | {
        id: string;
        kind: "file" | "note";
        sourcePath: string | null;
        sha256: string | null;
        blobRelPath: string | null;
      }
    | undefined;
  if (!doc) return { success: false };

  const decrementBlob = db.prepare("UPDATE blobs SET ref_count = ref_count - 1 WHERE sha256 = ?");
  const getBlobRow = db.prepare(
    "SELECT sha256, rel_path AS relPath, ref_count AS refCount FROM blobs WHERE sha256 = ?",
  );
  const deleteBlobRow = db.prepare("DELETE FROM blobs WHERE sha256 = ? AND ref_count <= 0");
  const deleteFingerprint = db.prepare("DELETE FROM file_fingerprints WHERE source_path = ?");
  const deleteDoc = db.prepare("DELETE FROM documents WHERE id = ?");

  let deleteBlobPath: string | null = null;

  db.exec("BEGIN");
  try {
    if (doc.kind === "file" && doc.sha256) {
      decrementBlob.run(doc.sha256);
      const row = getBlobRow.get(doc.sha256) as
        | { sha256: string; relPath: string; refCount: number }
        | undefined;
      deleteBlobRow.run(doc.sha256);
      const stillThere = getBlobRow.get(doc.sha256);
      if (!stillThere && row?.relPath) {
        deleteBlobPath = path.join(kbDir, row.relPath);
      }
    }

    if (doc.sourcePath) {
      deleteFingerprint.run(doc.sourcePath);
    }
    deleteDoc.run(doc.id);

    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  }

  if (deleteBlobPath) {
    try {
      await fs.promises.rm(deleteBlobPath, { force: true });
    } catch {
      // ignore
    }
  }

  return { success: true };
}

type VectorBuildJobPayload = {
  providerId: string;
  model: string;
  cursorRowid: number;
};

function parseVectorBuildJobPayload(raw: string): VectorBuildJobPayload {
  try {
    const parsed = JSON.parse(raw) as Partial<VectorBuildJobPayload>;
    return {
      providerId: String(parsed.providerId ?? ""),
      model: String(parsed.model ?? ""),
      cursorRowid: Number(parsed.cursorRowid ?? 0),
    };
  } catch {
    return { providerId: "", model: "", cursorRowid: 0 };
  }
}

function updateJobPayload(db: KnowledgeMetaDb, jobId: string, payload: unknown): void {
  db.prepare("UPDATE jobs SET payload_json = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(payload),
    Date.now(),
    jobId,
  );
}

async function handleGetVectorConfig(params: any): Promise<{ config: VectorConfig | null }> {
  const kbId = String(params?.kbId ?? "");
  if (!kbId) throw new Error("kbId 不能为空");
  const db = getDb(kbId);
  return { config: getVectorConfigRow(db) };
}

async function handleRebuildVectorIndex(params: any): Promise<{ success: boolean }> {
  const kbId = String(params?.kbId ?? "");
  const confirmed = Boolean(params?.confirmed);
  if (!kbId) throw new Error("kbId 不能为空");
  if (!confirmed) throw new Error("危险操作：重建向量索引需要 confirmed=true");

  const db = getDb(kbId);

  // 清理派生索引（可重建数据）
  const store = createLanceVectorStore(getVectorStoreDir(kbId));
  store.dropStoreDir();

  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM chunk_vectors").run();
    db.prepare("DELETE FROM vector_config").run();
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  }

  return { success: true };
}

async function handleBuildVectorIndex(params: any): Promise<{ jobId: string }> {
  const kbId = String(params?.kbId ?? "");
  const mode = (String(params?.mode ?? "incremental") as VectorBuildMode) || "incremental";
  const embedding = params?.embedding as Partial<OpenAICompatibleEmbeddingConfig> | undefined;
  const providerId = String(params?.providerId ?? "");
  const model = String(params?.model ?? embedding?.model ?? "").trim();

  if (!kbId) throw new Error("kbId 不能为空");
  if (!providerId) throw new Error("providerId 不能为空");
  if (!embedding?.apiKey) throw new Error("apiKey 不能为空");
  if (!model) throw new Error("model 不能为空");

  if (mode === "rebuild") {
    throw new Error("请先调用 rebuild，再执行增量构建");
  }

  const db = getDb(kbId);

  const existing = getVectorConfigRow(db);
  if (existing && (existing.providerId !== providerId || existing.model !== model)) {
    throw new Error("当前知识库向量索引配置已存在且不匹配，请先重建向量索引");
  }

  const active = db
    .prepare(
      "SELECT id FROM jobs WHERE type = 'build_vectors' AND status IN ('pending','processing','paused') ORDER BY created_at DESC LIMIT 1",
    )
    .get() as { id: string } | undefined;
  if (active?.id) {
    // 覆盖 embedding config，便于继续/恢复
    vectorJobEmbeddingConfig.set(active.id, {
      baseUrl: String(embedding.baseUrl ?? ""),
      apiKey: String(embedding.apiKey),
      model,
    });
    return { jobId: active.id };
  }

  const now = Date.now();
  const jobId = crypto.randomUUID();
  const payload: VectorBuildJobPayload = {
    providerId,
    model,
    cursorRowid: 0,
  };

  // progress_total：如果已有 config，统计缺失的；否则先用 chunks 总数
  let total = 0;
  if (existing) {
    const configHash = computeVectorConfigHash(existing);
    const row = db
      .prepare(
        `
        SELECT COUNT(*) AS n
        FROM chunks c
        LEFT JOIN chunk_vectors v ON v.chunk_id = c.id AND v.config_hash = ?
        WHERE v.chunk_id IS NULL
      `,
      )
      .get(configHash) as { n: number };
    total = Number(row?.n ?? 0);
  } else {
    const row = db.prepare("SELECT COUNT(*) AS n FROM chunks").get() as { n: number };
    total = Number(row?.n ?? 0);
  }

  db.prepare(
    `
    INSERT INTO jobs(id, type, status, payload_json, progress_current, progress_total, error_message, created_at, started_at, finished_at, updated_at, heartbeat_at)
    VALUES (?, 'build_vectors', 'pending', ?, 0, ?, NULL, ?, NULL, NULL, ?, NULL)
  `,
  ).run(jobId, JSON.stringify(payload), total, now, now);

  vectorJobEmbeddingConfig.set(jobId, {
    baseUrl: String(embedding.baseUrl ?? ""),
    apiKey: String(embedding.apiKey),
    model,
  });

  void processVectorBuildJob(kbId, jobId);
  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  return { jobId };
}

async function handleResumeVectorIndex(params: any): Promise<{ success: boolean }> {
  const kbId = String(params?.kbId ?? "");
  const jobId = String(params?.jobId ?? "");
  const embedding = params?.embedding as Partial<OpenAICompatibleEmbeddingConfig> | undefined;
  const model = String(params?.model ?? embedding?.model ?? "").trim();
  if (!kbId || !jobId) throw new Error("kbId/jobId 不能为空");
  if (!embedding?.apiKey) throw new Error("apiKey 不能为空");
  if (!model) throw new Error("model 不能为空");

  const db = getDb(kbId);
  const now = Date.now();
  db.prepare(
    "UPDATE jobs SET status = 'pending', updated_at = ? WHERE id = ? AND status IN ('paused','pending')",
  ).run(now, jobId);

  vectorJobEmbeddingConfig.set(jobId, {
    baseUrl: String(embedding.baseUrl ?? ""),
    apiKey: String(embedding.apiKey),
    model,
  });

  if (!runningVectorByKb.has(kbId)) {
    void processVectorBuildJob(kbId, jobId);
  }
  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  return { success: true };
}

async function handleSemanticSearch(params: any): Promise<{ results: VectorSearchResult[] }> {
  const kbId = String(params?.kbId ?? "");
  const query = String(params?.query ?? "").trim();
  const topK = Math.min(50, Math.max(1, Number(params?.topK ?? 10)));
  const embedding = params?.embedding as Partial<OpenAICompatibleEmbeddingConfig> | undefined;
  const providerId = String(params?.providerId ?? "");
  const model = String(params?.model ?? embedding?.model ?? "").trim();

  if (!kbId) throw new Error("kbId 不能为空");
  if (!query) return { results: [] };
  if (!providerId) throw new Error("providerId 不能为空");
  if (!embedding?.apiKey) throw new Error("apiKey 不能为空");
  if (!model) throw new Error("model 不能为空");

  const db = getDb(kbId);
  const config = getVectorConfigRow(db);
  if (!config) {
    throw new Error("尚未构建向量索引");
  }
  if (config.providerId !== providerId || config.model !== model) {
    throw new Error("向量索引配置不匹配，请重建向量索引");
  }

  const embedded = await embedWithRetry(
    { baseUrl: String(embedding.baseUrl ?? ""), apiKey: String(embedding.apiKey), model },
    [query],
  );

  const store = createLanceVectorStore(getVectorStoreDir(kbId));
  let table: Awaited<ReturnType<typeof store.openTable>>;
  try {
    table = await store.openTable("chunks");
  } catch {
    return { results: [] };
  }

  const rows = await vectorSearch(table, embedded.vectors[0], topK);
  return {
    results: rows.map((r: any) => ({
      chunkId: String(r.id ?? ""),
      documentId: String(r.documentId ?? ""),
      documentTitle: String(r.documentTitle ?? ""),
      content: String(r.content ?? ""),
      distance: typeof r._distance === "number" ? r._distance : null,
    })),
  };
}

async function embedWithRetry(
  config: OpenAICompatibleEmbeddingConfig,
  inputs: string[],
): Promise<{ vectors: number[][]; dimension: number }> {
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      return await embedTextsOpenAICompatible(config, inputs);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes("429") ||
        message.includes("503") ||
        message.includes("504") ||
        message.includes("timeout");
      if (!retryable || attempt >= 3) {
        throw error;
      }
      await sleep(800 * attempt);
    }
  }
}

async function processVectorBuildJob(kbId: string, jobId: string): Promise<void> {
  const db = getDb(kbId);
  if (runningVectorByKb.get(kbId) && runningVectorByKb.get(kbId) !== jobId) {
    return;
  }
  runningVectorByKb.set(kbId, jobId);

  const now = Date.now();
  db.prepare(
    "UPDATE jobs SET status = 'processing', started_at = COALESCE(started_at, ?), updated_at = ?, heartbeat_at = ? WHERE id = ?",
  ).run(now, now, now, jobId);
  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });

  try {
    const embedding = vectorJobEmbeddingConfig.get(jobId);
    if (!embedding) {
      throw new Error("缺少 embedding 配置（请重新点击构建/继续）");
    }

    const jobRow = db
      .prepare("SELECT payload_json AS payloadJson FROM jobs WHERE id = ?")
      .get(jobId) as { payloadJson: string } | undefined;
    const payload = parseVectorBuildJobPayload(jobRow?.payloadJson ?? "{}");
    if (!payload.providerId || !payload.model) {
      throw new Error("向量任务 payload 缺失 providerId/model");
    }
    if (payload.model !== embedding.model) {
      throw new Error("当前 embedding model 与任务不一致，请重建向量索引");
    }

    const store = createLanceVectorStore(getVectorStoreDir(kbId));
    let table: Awaited<ReturnType<typeof store.openTable>> | null = null;

    const existingConfig = getVectorConfigRow(db);
    if (
      existingConfig &&
      (existingConfig.providerId !== payload.providerId || existingConfig.model !== payload.model)
    ) {
      throw new Error("向量索引配置不匹配，请重建向量索引");
    }

    let config = existingConfig;
    if (config) {
      const configHash = computeVectorConfigHash(config);
      const currentRow = db
        .prepare("SELECT COUNT(*) AS n FROM chunk_vectors WHERE config_hash = ?")
        .get(configHash) as { n: number };
      db.prepare("UPDATE jobs SET progress_current = ?, updated_at = ? WHERE id = ?").run(
        Number(currentRow?.n ?? 0),
        Date.now(),
        jobId,
      );
    }

    while (true) {
      if (inMemoryCanceledJobs.has(jobId)) break;

      const job = db.prepare("SELECT status FROM jobs WHERE id = ?").get(jobId) as
        | { status: JobStatus }
        | undefined;
      const status = job?.status;
      if (!status || status === "done" || status === "failed" || status === "canceled") break;
      if (status === "paused") break;

      config = getVectorConfigRow(db);

      const configHash = config ? computeVectorConfigHash(config) : null;
      const batchSize = 32;

      const batch = configHash
        ? (db
            .prepare(
              `
              SELECT
                c.rowid AS rowid,
                c.id AS chunkId,
                c.document_id AS documentId,
                c.content AS content,
                d.title AS documentTitle
              FROM chunks c
              JOIN documents d ON d.id = c.document_id
              LEFT JOIN chunk_vectors v ON v.chunk_id = c.id AND v.config_hash = ?
              WHERE v.chunk_id IS NULL AND c.rowid > ?
              ORDER BY c.rowid ASC
              LIMIT ?
            `,
            )
            .all(configHash, payload.cursorRowid, batchSize) as any[])
        : (db
            .prepare(
              `
              SELECT
                c.rowid AS rowid,
                c.id AS chunkId,
                c.document_id AS documentId,
                c.content AS content,
                d.title AS documentTitle
              FROM chunks c
              JOIN documents d ON d.id = c.document_id
              WHERE c.rowid > ?
              ORDER BY c.rowid ASC
              LIMIT ?
            `,
            )
            .all(payload.cursorRowid, batchSize) as any[]);

      if (batch.length === 0) {
        // 最后构建索引（如可用）
        if (table) {
          try {
            await table.createIndex("vector");
          } catch {
            // ignore
          }
        }

        const doneNow = Date.now();
        db.prepare(
          "UPDATE jobs SET status = 'done', finished_at = ?, updated_at = ?, heartbeat_at = ? WHERE id = ?",
        ).run(doneNow, doneNow, doneNow, jobId);
        sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
        break;
      }

      const texts: string[] = batch.map((b) => String(b.content ?? ""));
      const embedded = await embedWithRetry(embedding, texts);

      if (!config) {
        config = upsertVectorConfigRow(db, {
          providerId: payload.providerId,
          model: payload.model,
          dimension: embedded.dimension,
        });
      } else if (config.dimension !== embedded.dimension) {
        throw new Error("embedding 维度与既有向量索引不一致，请重建向量索引");
      }

      const finalHash = computeVectorConfigHash(config);

      const rows: LanceVectorRecord[] = batch.map((b, idx) => ({
        id: String(b.chunkId),
        vector: embedded.vectors[idx],
        documentId: String(b.documentId),
        documentTitle: String(b.documentTitle ?? ""),
        content: String(b.content ?? ""),
      }));

      if (!table) {
        const ensured = await store.ensureTable("chunks", rows);
        table = ensured.table;
        if (!ensured.created) {
          await upsertVectorsById(table, rows);
        }
      } else {
        await upsertVectorsById(table, rows);
      }

      const indexedAt = Date.now();
      db.exec("BEGIN");
      try {
        const stmt = db.prepare(
          "INSERT OR REPLACE INTO chunk_vectors(chunk_id, config_hash, indexed_at) VALUES (?, ?, ?)",
        );
        for (const r of rows) {
          stmt.run(r.id, finalHash, indexedAt);
        }
        db.exec("COMMIT");
      } catch (error) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // ignore
        }
        throw error;
      }

      payload.cursorRowid = Number(batch[batch.length - 1]?.rowid ?? payload.cursorRowid);
      updateJobPayload(db, jobId, payload);

      const progress = db
        .prepare("SELECT COUNT(*) AS n FROM chunk_vectors WHERE config_hash = ?")
        .get(finalHash) as { n: number };
      db.prepare(
        "UPDATE jobs SET progress_current = ?, updated_at = ?, heartbeat_at = ? WHERE id = ?",
      ).run(Number(progress?.n ?? 0), Date.now(), Date.now(), jobId);

      sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "向量索引任务失败";
    const failNow = Date.now();
    db.prepare(
      "UPDATE jobs SET status = 'failed', error_message = ?, finished_at = ?, updated_at = ? WHERE id = ?",
    ).run(message, failNow, failNow, jobId);
    sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  } finally {
    runningVectorByKb.delete(kbId);
  }
}

const handlers: Record<string, (params: any) => Promise<any>> = {
  "kb.ensureInitialized": handleEnsureInitialized,
  "kb.importFiles": handleImportFiles,
  "kb.listJobs": handleListJobs,
  "kb.pauseJob": handlePauseJob,
  "kb.resumeJob": handleResumeJob,
  "kb.cancelJob": handleCancelJob,
  "kb.search": handleSearch,
  "kb.createNote": handleCreateNote,
  "kb.getStats": handleGetStats,
  "kb.listDocuments": handleListDocuments,
  "kb.deleteDocument": handleDeleteDocument,
  "kb.getVectorConfig": handleGetVectorConfig,
  "kb.rebuildVectorIndex": handleRebuildVectorIndex,
  "kb.buildVectorIndex": handleBuildVectorIndex,
  "kb.resumeVectorIndex": handleResumeVectorIndex,
  "kb.semanticSearch": handleSemanticSearch,
};

process.on("message", async (msg: KnowledgeWorkerRequest) => {
  if (!msg || typeof msg !== "object") return;
  const { id, method, params } = msg as KnowledgeWorkerRequest;
  if (!id || !method) return;

  const handler = handlers[method];
  if (!handler) {
    respondError(id, new Error(`未知方法: ${method}`));
    return;
  }

  try {
    const result = await handler(params as any);
    respondOk(id, result);
  } catch (error) {
    respondError(id, error);
  }
});

process.on("disconnect", () => {
  for (const db of dbCache.values()) {
    try {
      db.close();
    } catch {
      // ignore
    }
  }
  process.exit(0);
});

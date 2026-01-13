import fs from "node:fs";
import path from "node:path";
import * as lancedb from "@lancedb/lancedb";

export type LanceVectorRecord = {
  id: string;
  vector: number[];
  documentId: string;
  documentTitle: string;
  content: string;
};

export type LanceVectorSearchResult = LanceVectorRecord & {
  _distance?: number;
};

export type LanceVectorStore = {
  openTable: (tableName: string) => Promise<lancedb.Table>;
  ensureTable: (
    tableName: string,
    seedRows: LanceVectorRecord[],
  ) => Promise<{ table: lancedb.Table; created: boolean }>;
  dropStoreDir: () => void;
};

export function createLanceVectorStore(storeDir: string): LanceVectorStore {
  const resolved = path.resolve(storeDir);

  const connect = async () => {
    fs.mkdirSync(resolved, { recursive: true });
    return await lancedb.connect(resolved);
  };

  const openTable = async (tableName: string) => {
    const conn = await connect();
    return await conn.openTable(tableName);
  };

  const ensureTable = async (tableName: string, seedRows: LanceVectorRecord[]) => {
    const conn = await connect();
    try {
      return { table: await conn.openTable(tableName), created: false };
    } catch {
      // 表不存在：使用 seedRows 创建（LanceDB 会推断 schema）
      return { table: await conn.createTable(tableName, seedRows), created: true };
    }
  };

  const dropStoreDir = () => {
    if (!fs.existsSync(resolved)) return;
    fs.rmSync(resolved, { recursive: true, force: true });
  };

  return { openTable, ensureTable, dropStoreDir };
}

export async function upsertVectorsById(
  table: lancedb.Table,
  rows: LanceVectorRecord[],
): Promise<void> {
  if (rows.length === 0) return;
  await table.mergeInsert("id").whenMatchedUpdateAll().whenNotMatchedInsertAll().execute(rows);
}

export async function vectorSearch(
  table: lancedb.Table,
  queryVector: number[],
  topK: number,
): Promise<LanceVectorSearchResult[]> {
  const results = await table.vectorSearch(queryVector).limit(topK).toArray();
  return results as LanceVectorSearchResult[];
}

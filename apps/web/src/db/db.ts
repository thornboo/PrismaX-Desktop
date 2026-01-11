import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { webSchema } from "@prismax/database";

export const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(sql, { schema: webSchema });

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { webSchema } from "@prismax/database";

import { db } from "../db/db";

export const auth = betterAuth({
  appName: "PrismaX",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: webSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
});

export type Session = typeof auth.$Infer.Session;

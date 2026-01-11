import "server-only";

import { db } from "@/db/db";
import { webSchema } from "@prismax/database";
import { and, eq } from "drizzle-orm";

const { conversations, messages } = webSchema;

type ImportedMessage = {
  role?: unknown;
  content?: unknown;
  createdAt?: unknown;
};

type ImportedProviderHint = {
  name?: unknown;
  openaiBaseUrl?: unknown;
  openaiModel?: unknown;
};

type ConversationImportPayload = {
  version?: unknown;
  conversation?: { title?: unknown } | null;
  provider?: ImportedProviderHint | null;
  messages?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickRole(value: unknown): string {
  const role = asNonEmptyString(value);
  if (!role) return "user";
  if (role === "user" || role === "assistant" || role === "system") return role;
  return role;
}

async function resolveProviderIdForUser(
  userId: string,
  hint: ImportedProviderHint | null | undefined,
): Promise<string | null> {
  const baseUrl = asOptionalString(hint?.openaiBaseUrl);
  const model = asOptionalString(hint?.openaiModel);
  const name = asOptionalString(hint?.name);

  if (baseUrl && model) {
    const match = await db.query.aiProviders.findFirst({
      where: (table) =>
        and(
          eq(table.userId, userId),
          eq(table.openaiBaseUrl, baseUrl),
          eq(table.openaiModel, model),
        ),
    });
    if (match) return match.id;
  }

  if (name) {
    const match = await db.query.aiProviders.findFirst({
      where: (table) => and(eq(table.userId, userId), eq(table.name, name)),
    });
    if (match) return match.id;
  }

  const fallbackDefault = await db.query.aiProviders.findFirst({
    where: (table) => and(eq(table.userId, userId), eq(table.isDefault, true)),
  });

  return fallbackDefault?.id ?? null;
}

export async function importConversationFromJsonText(userId: string, jsonText: string) {
  const raw = JSON.parse(jsonText) as ConversationImportPayload;

  const title =
    asNonEmptyString(raw.conversation?.title) ?? "导入的会话";

  const providerId = await resolveProviderIdForUser(userId, raw.provider);

  const rawMessages = Array.isArray(raw.messages) ? (raw.messages as ImportedMessage[]) : [];
  const limited = rawMessages.slice(0, 2000);

  const conversationId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(conversations).values({
      id: conversationId,
      userId,
      providerId,
      title,
    });

    for (const item of limited) {
      const content = asNonEmptyString(item.content);
      if (!content) continue;

      await tx.insert(messages).values({
        id: crypto.randomUUID(),
        conversationId,
        role: pickRole(item.role),
        content,
        createdAt: asDate(item.createdAt) ?? new Date(),
      });
    }
  });

  return { conversationId };
}

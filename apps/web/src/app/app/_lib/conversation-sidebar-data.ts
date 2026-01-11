import { db } from "@/db/db";
import { webSchema } from "@prismax/database";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

const { conversations, messages } = webSchema;

export type ConversationRow = typeof conversations.$inferSelect;

export type ConversationMeta = {
  lastMessagePreview: string | null;
  lastMessageRole: string | null;
  lastMessageAt: string | null;
  messageCount: number;
};

function toPreview(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 80);
}

async function getMatchingConversationIds(userId: string, query: string) {
  const q = query.trim();
  if (!q) return null;

  const pattern = `%${q}%`;

  const titleMatches = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        or(ilike(conversations.title, pattern), ilike(conversations.id, pattern)),
      ),
    )
    .limit(200);

  const contentMatches = await db
    .selectDistinct({ id: messages.conversationId })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.userId, userId),
        or(ilike(messages.content, pattern), ilike(messages.role, pattern)),
      ),
    )
    .limit(200);

  const ids = new Set<string>();
  for (const row of titleMatches) ids.add(row.id);
  for (const row of contentMatches) ids.add(row.id);

  return Array.from(ids);
}

export async function getConversationSidebarData(
  userId: string,
  query?: string,
): Promise<{
  conversationList: ConversationRow[];
  metaByConversationId: Record<string, ConversationMeta>;
}> {
  const matchedIds = query ? await getMatchingConversationIds(userId, query) : null;

  const conversationList = matchedIds
    ? matchedIds.length === 0
      ? []
      : await db
          .select()
          .from(conversations)
          .where(and(eq(conversations.userId, userId), inArray(conversations.id, matchedIds)))
          .orderBy(desc(conversations.updatedAt))
    : await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt));

  const conversationIds = conversationList.map((c) => c.id);
  if (conversationIds.length === 0) {
    return { conversationList, metaByConversationId: {} };
  }

  const lastMessages = await db
    .selectDistinctOn([messages.conversationId], {
      conversationId: messages.conversationId,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(inArray(messages.conversationId, conversationIds))
    .orderBy(messages.conversationId, desc(messages.createdAt));

  const counts = await db
    .select({
      conversationId: messages.conversationId,
      messageCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(messages)
    .where(inArray(messages.conversationId, conversationIds))
    .groupBy(messages.conversationId);

  const lastById = Object.fromEntries(
    lastMessages.map((m) => [
      m.conversationId,
      {
        role: m.role,
        preview: toPreview(m.content),
        at: m.createdAt.toISOString(),
      },
    ]),
  );

  const countById = Object.fromEntries(
    counts.map((c) => [c.conversationId, c.messageCount]),
  );

  const metaByConversationId: Record<string, ConversationMeta> = {};

  for (const conversation of conversationList) {
    const last = lastById[conversation.id];
    metaByConversationId[conversation.id] = {
      lastMessagePreview: last?.preview ?? null,
      lastMessageRole: last?.role ?? null,
      lastMessageAt: last?.at ?? null,
      messageCount: countById[conversation.id] ?? 0,
    };
  }

  return { conversationList, metaByConversationId };
}

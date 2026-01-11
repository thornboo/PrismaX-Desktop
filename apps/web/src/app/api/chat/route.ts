import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db/db";
import { webSchema } from "@prismax/database";
import { streamAssistantReply } from "@/lib/ai/openai";
import { auth } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto/encryption";
import { and, eq } from "drizzle-orm";

const { aiProviders, conversations, messages, userAiSettings } = webSchema;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { conversationId?: unknown; content?: unknown }
    | null;

  const conversationId = asNonEmptyString(body?.conversationId);
  const content = asNonEmptyString(body?.content);

  if (!conversationId || !content) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const conversation = await db.query.conversations.findFirst({
    where: (table) =>
      and(eq(table.id, conversationId), eq(table.userId, session.user.id)),
  });

  if (!conversation) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const provider = conversation.providerId
    ? await db.query.aiProviders.findFirst({
        where: (table) =>
          and(eq(table.id, conversation.providerId!), eq(table.userId, session.user.id)),
      })
    : await db.query.aiProviders.findFirst({
        where: (table) =>
          and(eq(table.userId, session.user.id), eq(table.isDefault, true)),
      });

  const legacySettings = provider
    ? null
    : await db.query.userAiSettings.findFirst({
        where: (table) => eq(table.userId, session.user.id),
      });

  const apiKeyEnc = provider?.openaiApiKeyEnc ?? legacySettings?.openaiApiKeyEnc;
  const apiKey = apiKeyEnc ? decryptSecret(apiKeyEnc) : process.env.OPENAI_API_KEY;
  const baseUrl =
    provider?.openaiBaseUrl ??
    legacySettings?.openaiBaseUrl ??
    process.env.OPENAI_BASE_URL ??
    "https://api.openai.com";
  const model =
    provider?.openaiModel ??
    legacySettings?.openaiModel ??
    process.env.OPENAI_MODEL ??
    "gpt-4o-mini";

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY_NOT_SET" }, { status: 400 });
  }

  const userMessageId = crypto.randomUUID();
  const assistantMessageId = crypto.randomUUID();
  const now = new Date();

  await db.insert(messages).values({
    id: userMessageId,
    conversationId,
    role: "user",
    content,
  });

  await db.insert(messages).values({
    id: assistantMessageId,
    conversationId,
    role: "assistant",
    content: "",
  });

  await db.update(conversations).set({ updatedAt: now }).where(eq(conversations.id, conversationId));

  const history = await db.query.messages.findMany({
    where: (table) => eq(table.conversationId, conversationId),
    columns: { role: true, content: true },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit: 20,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantContent = "";
      let lastFlushAt = Date.now();

      const flush = async (force = false) => {
        const shouldFlush = force || Date.now() - lastFlushAt > 400;
        if (!shouldFlush) return;
        lastFlushAt = Date.now();
        await db
          .update(messages)
          .set({ content: assistantContent })
          .where(eq(messages.id, assistantMessageId));
      };

      try {
        const openAIMessages = [
          { role: "system" as const, content: "你是 PrismaX 的助手。请用简体中文回答。" },
          ...history
            .reverse()
            .map((m) => ({
              role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
              content: m.content,
            })),
        ];

        for await (const token of streamAssistantReply(openAIMessages, request.signal, {
          apiKey,
          baseUrl,
          model,
        })) {
          if (request.signal.aborted) break;
          assistantContent += token;
          controller.enqueue(encoder.encode(token));
          await flush(false);
        }

        await flush(true);
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI 请求失败";
        assistantContent = `（AI 响应失败：${message}）`;
        controller.enqueue(encoder.encode(assistantContent));
        await db
          .update(messages)
          .set({ content: assistantContent })
          .where(eq(messages.id, assistantMessageId));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

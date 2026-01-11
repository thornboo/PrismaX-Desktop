"use server";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/db";
import { webSchema } from "@prismax/database";
import { generateAssistantReply } from "@/lib/ai/openai";
import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

const { aiProviders, conversations, messages } = webSchema;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function renameConversationAction(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/app");
  }

  const conversationId = asString(formData.get("conversationId")).trim();
  const titleRaw = asString(formData.get("title")).trim();

  if (!conversationId) {
    redirect("/app");
  }

  await db
    .update(conversations)
    .set({
      title: titleRaw.length > 0 ? titleRaw : null,
      updatedAt: new Date(),
    })
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, session.user.id)));

  redirect(`/app/c/${conversationId}`);
}

export async function deleteConversationAction(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/app");
  }

  const conversationId = asString(formData.get("conversationId")).trim();
  const confirm = asString(formData.get("confirm"));

  if (!conversationId) {
    redirect("/app");
  }

  if (confirm !== "yes") {
    redirect(`/app/c/${conversationId}`);
  }

  await db
    .delete(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, session.user.id)));

  redirect("/app");
}

export async function setConversationProviderAction(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/app");
  }

  const conversationId = asString(formData.get("conversationId")).trim();
  const providerIdRaw = asString(formData.get("providerId")).trim();
  const providerId = providerIdRaw.length > 0 ? providerIdRaw : null;

  if (!conversationId) {
    redirect("/app");
  }

  if (providerId) {
    const provider = await db.query.aiProviders.findFirst({
      where: (table) => and(eq(table.id, providerId), eq(table.userId, session.user.id)),
    });
    if (!provider) {
      redirect(`/app/c/${conversationId}`);
    }
  }

  await db
    .update(conversations)
    .set({ providerId, updatedAt: new Date() })
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, session.user.id)));

  redirect(`/app/c/${conversationId}`);
}

export async function sendMessageAction(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/app");
  }

  const conversationIdRaw = formData.get("conversationId");
  const contentRaw = formData.get("content");

  const conversationId =
    typeof conversationIdRaw === "string" ? conversationIdRaw.trim() : "";
  const content = typeof contentRaw === "string" ? contentRaw.trim() : "";

  if (!conversationId || !content) {
    redirect("/app");
  }

  const canWrite = await db.query.conversations.findFirst({
    where: (table) =>
      and(eq(table.id, conversationId), eq(table.userId, session.user.id)),
  });

  if (!canWrite) {
    redirect("/app");
  }

  await db.insert(messages).values({
    id: randomUUID(),
    conversationId,
    role: "user",
    content,
  });

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  if (process.env.OPENAI_API_KEY) {
    try {
      const history = await db.query.messages.findMany({
        where: (table) => eq(table.conversationId, conversationId),
        columns: { role: true, content: true },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
        limit: 20,
      });

      const aiContent = await generateAssistantReply([
        { role: "system", content: "你是 PrismaX 的助手。请用简体中文回答。" },
        ...history.reverse().map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ]);

      if (aiContent) {
        await db.insert(messages).values({
          id: randomUUID(),
          conversationId,
          role: "assistant",
          content: aiContent,
        });

        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
      }
    } catch {
      await db.insert(messages).values({
        id: randomUUID(),
        conversationId,
        role: "assistant",
        content: "（AI 响应失败：请检查 OPENAI_API_KEY / 网络 / 模型配置）",
      });
    }
  }

  redirect(`/app/c/${conversationId}`);
}

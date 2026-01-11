import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db/db";
import { webSchema } from "@prismax/database";
import { auth } from "@/lib/auth";
import { and, asc, eq } from "drizzle-orm";

const { aiProviders, conversations, messages } = webSchema;

function asFormat(value: string | null): "json" | "md" {
  return value === "md" ? "md" : "json";
}

function slugifyForFilename(input: string) {
  const trimmed = input.trim().slice(0, 60);
  const ascii = trimmed
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return ascii.length > 0 ? ascii : "conversation";
}

function formatTimestampForFilename(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}-${hh}${mm}`;
}

function sanitizeDisplayPart(input: string) {
  return input
    .trim()
    .slice(0, 40)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:"*?<>|]/g, "_");
}

function contentDispositionFilename(fallbackFilename: string, utf8Filename: string) {
  const escaped = fallbackFilename.replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(utf8Filename);
  return `attachment; filename="${escaped}"; filename*=UTF-8''${encoded}`;
}

function toMarkdown(
  conversation: typeof conversations.$inferSelect,
  rows: Array<typeof messages.$inferSelect>,
) {
  const title = conversation.title ?? "未命名会话";
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  for (const row of rows) {
    lines.push(`## ${row.role}`);
    lines.push("");
    lines.push(row.content);
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { conversationId } = await context.params;
  const url = new URL(request.url);
  const format = asFormat(url.searchParams.get("format"));

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
    : null;

  const messageList = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const exportAt = new Date();
  const titleRaw = conversation.title ?? "";
  const titleSlug = slugifyForFilename(titleRaw);
  const titleDisplay = sanitizeDisplayPart(titleRaw) || "会话";
  const idPart = conversationId.slice(0, 8);
  const tsPart = formatTimestampForFilename(exportAt);
  const baseName = `prismax_${titleSlug}_${idPart}_${tsPart}`;
  const displayBaseName = `PrismaX_${titleDisplay}_${idPart}_${tsPart}`;

  if (format === "md") {
    const md = toMarkdown(conversation, messageList);
    const filename = `${baseName}.md`;
    const displayFilename = `${displayBaseName}.md`;
    return new Response(md, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "cache-control": "no-store",
        "content-disposition": contentDispositionFilename(filename, displayFilename),
      },
    });
  }

  const payload = {
    version: 1,
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    },
    provider: provider
      ? {
          name: provider.name,
          openaiBaseUrl: provider.openaiBaseUrl,
          openaiModel: provider.openaiModel,
        }
      : null,
    messages: messageList.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };

  const filename = `${baseName}.json`;
  const displayFilename = `${displayBaseName}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "content-disposition": contentDispositionFilename(filename, displayFilename),
    },
  });
}

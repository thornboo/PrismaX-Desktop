import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/db";
import { webSchema } from "@prismax/database";
import { auth } from "@/lib/auth";
import { and, asc, desc, eq } from "drizzle-orm";
import { AppShell } from "../../_components/AppShell";
import { ConversationSidebar } from "../../_components/ConversationSidebar";
import { getConversationSidebarData } from "../../_lib/conversation-sidebar-data";
import { ChatClient } from "./ChatClient";
import {
  deleteConversationAction,
  renameConversationAction,
  setConversationProviderAction,
} from "./actions";

const { aiProviders, conversations, messages } = webSchema;

type PageProps = {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickSearchQuery(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  return "";
}

export default async function ConversationPage({ params, searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/app");
  }

  const { conversationId } = await params;
  const query = pickSearchQuery((await searchParams).q);

  const { conversationList, metaByConversationId } =
    await getConversationSidebarData(session.user.id, query);

  const conversation = await db.query.conversations.findFirst({
    where: (table) =>
      and(eq(table.id, conversationId), eq(table.userId, session.user.id)),
  });

  if (!conversation) {
    redirect("/app");
  }

  const providerList = await db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.userId, session.user.id))
    .orderBy(desc(aiProviders.isDefault), desc(aiProviders.updatedAt));

  const messageList = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const messageItems = messageList.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <AppShell
      sidebar={
        <ConversationSidebar
          sessionEmail={session.user.email}
          conversationList={conversationList}
          selectedConversationId={conversationId}
          metaByConversationId={metaByConversationId}
          searchQuery={query}
          searchActionPath={`/app/c/${conversationId}`}
        />
      }
    >
      <div className="flex h-full flex-col">
        <header className="border-b border-white/10 bg-zinc-950/60 px-6 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-200">
                {conversation.title ?? "未命名会话"}
              </div>
              <div className="mt-1 truncate text-xs text-zinc-500">
                会话 ID：{conversation.id}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {providerList.length > 0 ? (
                <form
                  action={setConversationProviderAction}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="conversationId" value={conversationId} />
                  <select
                    name="providerId"
                    defaultValue={conversation.providerId ?? ""}
                    className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 outline-none focus:border-white/20"
                  >
                    <option value="">使用默认 Provider</option>
                    {providerList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.isDefault ? "（默认）" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 hover:bg-white/10"
                  >
                    应用
                  </button>
                </form>
              ) : null}

              <details className="relative">
                <summary className="list-none">
                  <span className="inline-flex h-9 cursor-pointer items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 hover:bg-white/10">
                    导出
                  </span>
                </summary>
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-950/95 p-2 shadow-xl backdrop-blur">
                  <a
                    href={`/api/conversations/${conversationId}/export?format=json`}
                    className="block rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
                  >
                    导出 JSON
                    <div className="mt-0.5 text-xs text-zinc-500">用于备份/再次导入</div>
                  </a>
                  <a
                    href={`/api/conversations/${conversationId}/export?format=md`}
                    className="block rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
                  >
                    导出 Markdown
                    <div className="mt-0.5 text-xs text-zinc-500">用于分享/粘贴到文档</div>
                  </a>
                </div>
              </details>

              <form action={renameConversationAction} className="flex items-center gap-2">
                <input type="hidden" name="conversationId" value={conversationId} />
                <input
                  name="title"
                  defaultValue={conversation.title ?? ""}
                  className="h-9 w-44 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-white/20"
                  placeholder="重命名…"
                />
                <button
                  type="submit"
                  className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 hover:bg-white/10"
                >
                  保存
                </button>
              </form>

              <form action={deleteConversationAction} className="flex items-center gap-2">
                <input type="hidden" name="conversationId" value={conversationId} />
                <label className="flex items-center gap-2 text-xs text-zinc-500">
                  <input
                    name="confirm"
                    value="yes"
                    type="checkbox"
                    className="h-4 w-4 accent-white/80"
                    required
                  />
                  确认
                </label>
                <button
                  type="submit"
                  className="h-9 rounded-md bg-red-500/90 px-3 text-sm font-medium text-white hover:bg-red-500"
                >
                  删除
                </button>
              </form>
            </div>
          </div>
        </header>

        <ChatClient conversationId={conversationId} initialMessages={messageItems} />
      </div>
    </AppShell>
  );
}

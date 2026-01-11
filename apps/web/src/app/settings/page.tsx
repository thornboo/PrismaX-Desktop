import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db/db";
import { webSchema } from "@prismax/database";
import { auth } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

const { aiProviders, userAiSettings } = webSchema;

import {
  createProviderAction,
  deleteProviderAction,
  importConversationAction,
  setDefaultProviderAction,
  updateProviderAction,
} from "./actions";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/settings");
  }

  const providerList = await db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.userId, session.user.id))
    .orderBy(desc(aiProviders.updatedAt));

  const defaultProvider = providerList.find((p) => p.isDefault) ?? null;

  const legacySettings =
    providerList.length > 0
      ? null
      : await db.query.userAiSettings.findFirst({
          where: (table) => eq(table.userId, session.user.id),
        });

  const effectiveBaseUrl =
    defaultProvider?.openaiBaseUrl ??
    legacySettings?.openaiBaseUrl ??
    process.env.OPENAI_BASE_URL ??
    "https://api.openai.com";
  const effectiveModel =
    defaultProvider?.openaiModel ??
    legacySettings?.openaiModel ??
    process.env.OPENAI_MODEL ??
    "gpt-4o-mini";

  return (
    <main className="p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">设置</h1>
            <div className="mt-1 text-sm text-zinc-400">当前账号：{session.user.email}</div>
          </div>
          <Link className="text-sm text-zinc-300 underline underline-offset-4" href="/app">
            返回应用
          </Link>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">AI Providers（OpenAI 兼容）</h2>
            <div className="text-sm text-zinc-400">一个账号可保存多个配置，并切换默认。</div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-300">
              当前默认：{defaultProvider ? defaultProvider.name : "（未设置，使用回退）"}
              <div className="mt-1 text-xs text-zinc-500">
                生效参数：BaseURL={effectiveBaseUrl} · Model={effectiveModel}
              </div>
            </div>

            <form action={createProviderAction} className="space-y-3">
              <div className="text-sm font-semibold">新增 Provider</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="name"
                  className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
                  placeholder="名称（例如：OpenAI / DeepSeek / Moonshot）"
                  required
                />
                <input
                  name="openaiModel"
                  defaultValue="gpt-4o-mini"
                  className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
                  placeholder="Model（例如：gpt-4o-mini）"
                />
                <input
                  name="openaiBaseUrl"
                  defaultValue={effectiveBaseUrl}
                  className="h-10 sm:col-span-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
                  placeholder="Base URL（例如：https://api.openai.com 或 https://xxx/v1）"
                />
                <input
                  name="openaiApiKey"
                  type="password"
                  className="h-10 sm:col-span-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
                  placeholder="API Key（不会回显，服务端加密存储）"
                  autoComplete="off"
                />
              </div>

              <button
                type="submit"
                className="h-10 rounded-md bg-white px-4 text-sm font-medium text-zinc-900"
              >
                创建
              </button>
            </form>

            <div className="space-y-2">
              <div className="text-sm font-semibold">已保存</div>
              <div className="space-y-2">
                {providerList.map((p) => (
                  <details
                    key={p.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-200">
                            {p.name}
                            {p.isDefault ? (
                              <span className="ml-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">
                                默认
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 truncate text-xs text-zinc-500">
                            {p.openaiBaseUrl ?? "（未设置 Base URL）"} ·{" "}
                            {p.openaiModel ?? "（未设置 Model）"}
                          </div>
                        </div>
                      </div>
                    </summary>

                    <div className="mt-4 space-y-3">
                      {!p.isDefault ? (
                        <form action={setDefaultProviderAction}>
                          <input type="hidden" name="providerId" value={p.id} />
                          <button
                            type="submit"
                            className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 hover:bg-white/10"
                          >
                            设为默认
                          </button>
                        </form>
                      ) : null}

                      <form action={updateProviderAction} className="grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="providerId" value={p.id} />
                        <input
                          name="name"
                          defaultValue={p.name}
                          className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
                          placeholder="名称"
                          required
                        />
                        <input
                          name="openaiModel"
                          defaultValue={p.openaiModel ?? effectiveModel}
                          className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
                          placeholder="Model"
                        />
                        <input
                          name="openaiBaseUrl"
                          defaultValue={p.openaiBaseUrl ?? effectiveBaseUrl}
                          className="h-10 sm:col-span-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
                          placeholder="Base URL"
                        />
                        <input
                          name="openaiApiKey"
                          type="password"
                          className="h-10 sm:col-span-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
                          placeholder="API Key（留空不更新）"
                          autoComplete="off"
                        />
                        <div className="flex items-center gap-3 sm:col-span-2">
                          <button
                            type="submit"
                            className="h-10 rounded-md bg-white px-4 text-sm font-medium text-zinc-900"
                          >
                            保存
                          </button>
                          <button
                            type="submit"
                            name="intent"
                            value="clear-key"
                            className="h-10 rounded-md border border-white/10 bg-white/5 px-4 text-sm text-zinc-200 hover:bg-white/10"
                          >
                            清除 Key
                          </button>
                        </div>
                      </form>

                      <form action={deleteProviderAction} className="flex items-center gap-3">
                        <input type="hidden" name="providerId" value={p.id} />
                        <label className="flex items-center gap-2 text-xs text-zinc-500">
                          <input
                            name="confirm"
                            value="yes"
                            type="checkbox"
                            className="h-4 w-4 accent-white/80"
                            required
                          />
                          确认删除
                        </label>
                        <button
                          type="submit"
                          className="h-10 rounded-md bg-red-500/90 px-4 text-sm font-medium text-white hover:bg-red-500"
                        >
                          删除
                        </button>
                      </form>
                    </div>
                  </details>
                ))}

                {providerList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
                    还没有 Provider。你可以新增一个；否则会回退到环境变量 / 旧版设置表。
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">导出</h2>
            <div className="text-sm text-zinc-400">
              在会话页右上角「导出」菜单下载 JSON / Markdown。
            </div>
          </div>

          <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-zinc-200">
              导入（少用）
              <div className="mt-1 text-xs font-normal text-zinc-500">
                仅支持粘贴 PrismaX 导出的 JSON，导入为新会话。
              </div>
            </summary>

            <form action={importConversationAction} className="mt-4 space-y-3">
              <textarea
                name="payload"
                className="min-h-40 w-full resize-y rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-white/20"
                placeholder="粘贴导出的 JSON…"
                required
              />
              <button
                type="submit"
                className="h-10 rounded-md bg-white px-4 text-sm font-medium text-zinc-900"
              >
                导入为新会话
              </button>
            </form>
          </details>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="text-sm font-semibold">说明</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-400">
            <li>Key 会加密存储在数据库（使用 APP_ENCRYPTION_KEY 或 BETTER_AUTH_SECRET 派生）。</li>
            <li>聊天请求在服务端发起，不会把 Key 暴露给浏览器。</li>
            <li>OpenAI 兼容：默认使用 /v1/chat/completions（baseURL 支持带或不带 /v1）。</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

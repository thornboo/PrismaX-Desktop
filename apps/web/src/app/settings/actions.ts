"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/db";
import { webSchema } from "@prismax/database";
import { auth } from "@/lib/auth";
import { importConversationFromJsonText } from "@/lib/conversations/import";
import { encryptSecret } from "@/lib/crypto/encryption";
import { and, desc, eq } from "drizzle-orm";

const { aiProviders } = webSchema;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeUrl(raw: string): string {
  const input = raw.trim();
  if (!input) return "";
  const url = new URL(input);
  return url.toString().replace(/\/+$/, "");
}

async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/settings");
  }

  return session;
}

export async function createProviderAction(formData: FormData) {
  const session = await requireSession();

  const name = asString(formData.get("name")).trim() || "默认";
  const openaiBaseUrlRaw = asString(formData.get("openaiBaseUrl"));
  const openaiModel = asString(formData.get("openaiModel")).trim() || "gpt-4o-mini";
  const openaiApiKey = asString(formData.get("openaiApiKey")).trim();

  const openaiBaseUrl = openaiBaseUrlRaw ? normalizeUrl(openaiBaseUrlRaw) : "";
  const openaiApiKeyEnc = openaiApiKey.length > 0 ? encryptSecret(openaiApiKey) : null;

  const existingDefault = await db.query.aiProviders.findFirst({
    where: (table) =>
      and(eq(table.userId, session.user.id), eq(table.isDefault, true)),
  });

  await db.insert(aiProviders).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    name,
    openaiBaseUrl: openaiBaseUrl.length > 0 ? openaiBaseUrl : null,
    openaiModel,
    openaiApiKeyEnc,
    isDefault: existingDefault ? false : true,
  });

  redirect("/settings");
}

export async function updateProviderAction(formData: FormData) {
  const session = await requireSession();

  const providerId = asString(formData.get("providerId")).trim();
  const intent = asString(formData.get("intent")).trim() || "save";

  if (!providerId) {
    redirect("/settings");
  }

  const name = asString(formData.get("name")).trim() || "默认";
  const openaiBaseUrlRaw = asString(formData.get("openaiBaseUrl"));
  const openaiModel = asString(formData.get("openaiModel")).trim() || "gpt-4o-mini";
  const openaiApiKey = asString(formData.get("openaiApiKey")).trim();

  const openaiBaseUrl = openaiBaseUrlRaw ? normalizeUrl(openaiBaseUrlRaw) : "";

  const existing = await db.query.aiProviders.findFirst({
    where: (table) =>
      and(eq(table.id, providerId), eq(table.userId, session.user.id)),
  });

  if (!existing) {
    redirect("/settings");
  }

  const nextKeyEnc =
    intent === "clear-key"
      ? null
      : openaiApiKey.length > 0
        ? encryptSecret(openaiApiKey)
        : existing.openaiApiKeyEnc;

  await db
    .update(aiProviders)
    .set({
      name,
      openaiBaseUrl: openaiBaseUrl.length > 0 ? openaiBaseUrl : null,
      openaiModel,
      openaiApiKeyEnc: nextKeyEnc,
      updatedAt: new Date(),
    })
    .where(and(eq(aiProviders.id, providerId), eq(aiProviders.userId, session.user.id)));

  redirect("/settings");
}

export async function setDefaultProviderAction(formData: FormData) {
  const session = await requireSession();

  const providerId = asString(formData.get("providerId")).trim();
  if (!providerId) {
    redirect("/settings");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(aiProviders)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(aiProviders.userId, session.user.id));

    await tx
      .update(aiProviders)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(aiProviders.id, providerId), eq(aiProviders.userId, session.user.id)));
  });

  redirect("/settings");
}

export async function deleteProviderAction(formData: FormData) {
  const session = await requireSession();

  const providerId = asString(formData.get("providerId")).trim();
  const confirm = asString(formData.get("confirm")).trim();

  if (!providerId) {
    redirect("/settings");
  }

  if (confirm !== "yes") {
    redirect("/settings");
  }

  await db.transaction(async (tx) => {
    const provider = await tx.query.aiProviders.findFirst({
      where: (table) =>
        and(eq(table.id, providerId), eq(table.userId, session.user.id)),
    });

    if (!provider) return;

    await tx
      .delete(aiProviders)
      .where(and(eq(aiProviders.id, providerId), eq(aiProviders.userId, session.user.id)));

    if (provider.isDefault) {
      const next = await tx.query.aiProviders.findFirst({
        where: (table) => eq(table.userId, session.user.id),
        orderBy: (table) => [desc(table.updatedAt)],
      });

      if (next) {
        await tx
          .update(aiProviders)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(and(eq(aiProviders.id, next.id), eq(aiProviders.userId, session.user.id)));
      }
    }
  });

  redirect("/settings");
}

export async function importConversationAction(formData: FormData) {
  const session = await requireSession();

  const payload = asString(formData.get("payload")).trim();
  if (!payload) {
    redirect("/settings");
  }

  const { conversationId } = await importConversationFromJsonText(session.user.id, payload);
  redirect(`/app/c/${conversationId}`);
}

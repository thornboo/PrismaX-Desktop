"use server";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/db";
import { webSchema } from "@prismax/database";
import { auth } from "@/lib/auth";

const { conversations } = webSchema;

export async function createConversationAction(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/app");
  }

  const titleRaw = formData.get("title");
  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";

  const id = randomUUID();

  const defaultProvider = await db.query.aiProviders.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.userId, session.user.id), eq(table.isDefault, true)),
  });

  await db.insert(conversations).values({
    id,
    userId: session.user.id,
    providerId: defaultProvider?.id ?? null,
    title: title.length > 0 ? title : null,
  });

  redirect(`/app/c/${id}`);
}

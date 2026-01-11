import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { auth } from "@/lib/auth";

export default async function AppHomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/app");
  }

  return (
    <main className="p-8">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">PrismaX</h1>
          <p className="text-sm text-black/60">已登录：{session.user.email}</p>
        </div>

        <SignOutButton />
      </div>
    </main>
  );
}


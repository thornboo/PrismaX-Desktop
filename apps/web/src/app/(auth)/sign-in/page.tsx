"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("callbackURL") ?? "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">登录</h1>
        <p className="text-sm text-black/60">使用邮箱和密码登录 PrismaX。</p>
      </header>

      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setErrorMessage(null);

          try {
            setIsPending(true);
            const { error } = await authClient.signIn.email({
              email,
              password,
              callbackURL,
              rememberMe: true,
            });

            if (error) {
              setErrorMessage(error.message);
              return;
            }

            router.replace(callbackURL);
            router.refresh();
          } finally {
            setIsPending(false);
          }
        }}
      >
        <label className="block space-y-1">
          <div className="text-sm">邮箱</div>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1">
          <div className="text-sm">密码</div>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {errorMessage ? (
          <p className="text-sm text-red-600">{errorMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          登录
        </button>
      </form>

      <p className="text-sm text-black/60">
        还没有账号？{" "}
        <Link className="text-black underline" href="/sign-up">
          去注册
        </Link>
      </p>
    </main>
  );
}


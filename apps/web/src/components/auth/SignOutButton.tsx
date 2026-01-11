"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={async () => {
        try {
          setIsPending(true);
          await authClient.signOut({
            fetchOptions: {
              onSuccess() {
                router.replace("/sign-in");
              },
            },
          });
        } finally {
          setIsPending(false);
        }
      }}
      className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
    >
      退出登录
    </button>
  );
}


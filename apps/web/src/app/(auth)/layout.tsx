import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh px-6 py-10">
      <div className="mx-auto w-full max-w-sm">{children}</div>
    </div>
  );
}


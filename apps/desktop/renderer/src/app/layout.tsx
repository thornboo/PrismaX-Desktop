import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="m-0 h-dvh bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "사데봇 관리자",
  description: "사데봇 관리자 대시보드",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-neutral-100 text-neutral-900">{children}</body>
    </html>
  );
}

import Link from "next/link";
import { requireAdmin, adminLogoutAction } from "@/lib/actions/adminAuth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL, hasPermission } from "@/lib/rbac";

const NAV: { href: string; label: string; permission?: Parameters<typeof hasPermission>[1] }[] = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/cases", label: "사건 관리" },
  { href: "/admin/disputes", label: "이의제기", permission: "RESOLVE_DISPUTE" },
  { href: "/admin/certifications", label: "안전서버 인증", permission: "MANAGE_CERTIFICATION" },
  { href: "/admin/stats", label: "통계" },
  { href: "/admin/audit", label: "감사 로그", permission: "VIEW_AUDIT_LOG" },
  { href: "/admin/admins", label: "운영진 관리", permission: "MANAGE_ADMINS" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  const [pendingCases, pendingDisputes, needInfoCases, pendingCerts] = await Promise.all([
    prisma.case.count({ where: { status: "RECEIVED" } }),
    prisma.dispute.count({ where: { status: "PENDING" } }),
    prisma.case.count({ where: { status: "NEEDS_MORE_INFO" } }),
    prisma.serverCertification.count({ where: { status: { in: ["PENDING", "INFO_CHECK", "TESTING", "REVIEW"] } } }),
  ]);
  const badges: Record<string, number> = {
    "/admin/cases": pendingCases,
    "/admin/disputes": pendingDisputes,
    "/admin/certifications": pendingCerts,
  };

  return (
    <div className="min-h-screen flex bg-neutral-100">
      <aside className="w-56 shrink-0 bg-neutral-900 text-neutral-300 min-h-screen p-4">
        <Link href="/admin" className="block text-white font-bold text-lg mb-6">
          🛡️ 사데봇 Admin
        </Link>
        <nav className="space-y-1 text-sm">
          {NAV.filter((item) => !item.permission || hasPermission(admin.role, item.permission)).map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-neutral-800 hover:text-white">
              <span>{item.label}</span>
              {badges[item.href] > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5">{badges[item.href]}</span>}
            </Link>
          ))}
        </nav>
        {needInfoCases > 0 && (
          <p className="mt-6 text-xs text-amber-400 px-3">🟠 추가자료 요청 대기 {needInfoCases}건</p>
        )}
      </aside>
      <div className="flex-1 min-w-0">
        <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-end gap-4 px-6 text-sm">
          <span className="text-neutral-500">
            {admin.displayName ?? admin.discordId} ({ROLE_LABEL[admin.role]})
          </span>
          <form action={adminLogoutAction}>
            <button className="text-neutral-400 hover:text-neutral-700">로그아웃</button>
          </form>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

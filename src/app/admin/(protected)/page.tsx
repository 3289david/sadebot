import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [pending, disputes, needInfo, recent] = await Promise.all([
    prisma.case.count({ where: { status: "RECEIVED" } }),
    prisma.dispute.count({ where: { status: "PENDING" } }),
    prisma.case.count({ where: { status: "NEEDS_MORE_INFO" } }),
    prisma.case.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">ADMIN</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="대기 중인 제보" value={pending} href="/admin/cases?status=RECEIVED" />
        <StatCard label="이의제기" value={disputes} href="/admin/disputes" />
        <StatCard label="추가자료 요청" value={needInfo} href="/admin/cases?status=NEEDS_MORE_INFO" />
      </div>

      <h2 className="text-sm font-semibold text-neutral-500 mb-3">최근 등록</h2>
      <div className="bg-white rounded-xl border border-neutral-200 divide-y">
        {recent.map((c) => (
          <Link
            key={c.id}
            href={`/admin/cases/${c.id}`}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-neutral-50"
          >
            <span className="font-medium">CASE #{c.caseNumber}</span>
            <span className="text-neutral-500">{c.damageType}</span>
            <span>{STATUS_LABEL[c.status] ?? c.status}</span>
            <span className="text-neutral-400 text-xs">{c.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
          </Link>
        ))}
        {recent.length === 0 && <p className="px-4 py-6 text-sm text-neutral-400">등록된 사건이 없습니다.</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-indigo-300 transition-colors">
      <p className="text-sm text-neutral-500 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </Link>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL } from "@/lib/constants";
import type { CaseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALL_STATUSES = Object.keys(STATUS_LABEL) as CaseStatus[];

export default async function AdminCasesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = status && ALL_STATUSES.includes(status as CaseStatus) ? (status as CaseStatus) : undefined;

  const cases = await prisma.case.findMany({
    where: filter ? { status: filter } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { reports: true, evidence: true, disputes: true } } },
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">사건 관리</h1>
      <div className="flex gap-2 mb-4 flex-wrap text-xs">
        <Link href="/admin/cases" className={`px-3 py-1.5 rounded-full border ${!filter ? "bg-neutral-900 text-white" : "bg-white"}`}>
          전체
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/cases?status=${s}`}
            className={`px-3 py-1.5 rounded-full border ${filter === s ? "bg-neutral-900 text-white" : "bg-white"}`}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 divide-y">
        <div className="grid grid-cols-6 gap-2 px-4 py-2 text-xs font-semibold text-neutral-400">
          <span>사건번호</span>
          <span>유형</span>
          <span>상태</span>
          <span>제보/증거/이의</span>
          <span>금액</span>
          <span>접수일</span>
        </div>
        {cases.map((c) => (
          <Link key={c.id} href={`/admin/cases/${c.id}`} className="grid grid-cols-6 gap-2 px-4 py-3 text-sm hover:bg-neutral-50">
            <span className="font-medium">#{c.caseNumber}</span>
            <span>{c.damageType}</span>
            <span>{STATUS_LABEL[c.status]}</span>
            <span>
              {c._count.reports}/{c._count.evidence}/{c._count.disputes}
            </span>
            <span>{c.damageAmount ? `₩${c.damageAmount.toLocaleString()}` : "-"}</span>
            <span className="text-neutral-400 text-xs">{c.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
          </Link>
        ))}
        {cases.length === 0 && <p className="px-4 py-6 text-sm text-neutral-400">해당하는 사건이 없습니다.</p>}
      </div>
    </div>
  );
}

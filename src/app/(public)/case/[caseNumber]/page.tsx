import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { maskByType } from "@/lib/mask";
import { STATUS_LABEL, IDENTIFIER_LABEL } from "@/lib/constants";
import type { CaseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PUBLIC_STATUSES: CaseStatus[] = ["REVIEWING", "NEEDS_MORE_INFO", "VERIFIED", "DISPUTED", "ON_HOLD", "EXPLAINED"];

export default async function CaseDetailPage({ params }: { params: Promise<{ caseNumber: string }> }) {
  const { caseNumber } = await params;
  const normalized = caseNumber.toUpperCase().replace(/^CASE#?/, "");

  const c = await prisma.case.findFirst({
    where: { caseNumber: normalized, status: { in: PUBLIC_STATUSES } },
    include: {
      identifiers: true,
      _count: { select: { reports: true, evidence: true, disputes: true } },
    },
  });

  if (!c) notFound();

  return (
    <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12">
      <Link href="/search" className="text-sm text-zinc-400 hover:underline">
        ← 검색으로
      </Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-bold">CASE #{c.caseNumber}</h1>
        <span className="text-sm px-3 py-1 rounded-full bg-zinc-100">{STATUS_LABEL[c.status] ?? c.status}</span>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <dt className="text-zinc-400">유형</dt>
          <dd>{c.damageType}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">관련 플랫폼</dt>
          <dd>{c.platform ?? "미상"}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">발생일</dt>
          <dd>{c.occurredAt ? c.occurredAt.toISOString().slice(0, 10) : "미상"}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">제보/증거/이의제기</dt>
          <dd>
            {c._count.reports}건 / {c._count.evidence}개 / {c._count.disputes}건
          </dd>
        </div>
      </dl>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-500 mb-2">연관 식별자 (마스킹)</h2>
        <div className="space-y-1 text-sm">
          {c.identifiers.length === 0 && <p className="text-zinc-400">등록된 연관 식별자 없음</p>}
          {c.identifiers.map((i) => (
            <div key={i.id} className="flex gap-2">
              <span className="text-zinc-400 w-28 shrink-0">{IDENTIFIER_LABEL[i.type] ?? i.type}</span>
              <span className="font-mono">{maskByType(i.type, i.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-500 mb-2">사건 설명</h2>
        <p className="text-sm whitespace-pre-line bg-zinc-50 border border-zinc-200 rounded-lg p-4">{c.description}</p>
      </div>

      <div className="border-t border-zinc-200 pt-4 text-xs text-zinc-400 space-y-2">
        <p>※ 본 정보만으로 범죄 사실이 확정되는 것은 아닙니다.</p>
        <p>
          당사자이며 사실관계가 다르다면{" "}
          <span className="font-medium text-zinc-600">디스코드 서버에서 `/이의제기 사건번호:{c.caseNumber}`</span> 명령어로
          소명할 수 있습니다.
        </p>
      </div>
    </main>
  );
}

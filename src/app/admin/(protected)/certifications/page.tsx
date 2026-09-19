import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/adminAuth";
import { hasPermission } from "@/lib/rbac";
import { CERT_STATUS_LABEL } from "@/lib/certService";
import type { CertStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALL_STATUSES = Object.keys(CERT_STATUS_LABEL) as CertStatus[];

export default async function AdminCertificationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await requireAdmin();
  if (!hasPermission(admin.role, "MANAGE_CERTIFICATION")) redirect("/admin");

  const { status } = await searchParams;
  const filter = status && ALL_STATUSES.includes(status as CertStatus) ? (status as CertStatus) : undefined;

  const certs = await prisma.serverCertification.findMany({
    where: filter ? { status: filter } : {},
    orderBy: { appliedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">🛡️ 안전서버 인증</h1>
      <div className="flex gap-2 mb-4 flex-wrap text-xs">
        <Link href="/admin/certifications" className={`px-3 py-1.5 rounded-full border ${!filter ? "bg-neutral-900 text-white" : "bg-white"}`}>
          전체
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link key={s} href={`/admin/certifications?status=${s}`} className={`px-3 py-1.5 rounded-full border ${filter === s ? "bg-neutral-900 text-white" : "bg-white"}`}>
            {CERT_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <div className="divide-y min-w-[560px]">
          <div className="grid grid-cols-5 gap-2 px-4 py-2 text-xs font-semibold text-neutral-400">
            <span>인증번호</span>
            <span>서버명</span>
            <span>상태</span>
            <span>신청일</span>
            <span>만료일</span>
          </div>
          {certs.map((c) => (
            <Link key={c.id} href={`/admin/certifications/${c.id}`} className="grid grid-cols-5 gap-2 px-4 py-3 text-sm hover:bg-neutral-50">
              <span className="font-medium">{c.certNumber}</span>
              <span>{c.guildName ?? c.guildId}</span>
              <span>{CERT_STATUS_LABEL[c.status]}</span>
              <span className="text-xs text-neutral-400">{c.appliedAt.toISOString().slice(0, 10)}</span>
              <span className="text-xs text-neutral-400">{c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "-"}</span>
            </Link>
          ))}
          {certs.length === 0 && <p className="px-4 py-6 text-sm text-neutral-400">해당하는 인증 신청이 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DISPUTE_REASON_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage() {
  const disputes = await prisma.dispute.findMany({
    orderBy: { createdAt: "desc" },
    include: { case: true },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">이의제기</h1>
      <div className="bg-white rounded-xl border border-neutral-200 divide-y">
        {disputes.map((d) => (
          <Link key={d.id} href={`/admin/cases/${d.caseId}`} className="block px-4 py-3 hover:bg-neutral-50">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">CASE #{d.case.caseNumber}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-600"}`}>
                {d.status}
              </span>
            </div>
            <p className="text-sm text-neutral-600">{DISPUTE_REASON_LABEL[d.reason] ?? d.reason}</p>
            <p className="text-xs text-neutral-400 mt-1">{d.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
          </Link>
        ))}
        {disputes.length === 0 && <p className="px-4 py-6 text-sm text-neutral-400">이의제기 내역이 없습니다.</p>}
      </div>
    </div>
  );
}

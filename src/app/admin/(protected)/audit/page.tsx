import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/adminAuth";
import { hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const admin = await requireAdmin();
  if (!hasPermission(admin.role, "VIEW_AUDIT_LOG")) redirect("/admin");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { admin: true },
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">감사 로그</h1>
      <div className="bg-white rounded-xl border border-neutral-200 divide-y text-sm">
        {logs.map((l) => (
          <div key={l.id} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs bg-neutral-100 px-2 py-0.5 rounded">{l.action}</span>
              <span className="text-xs text-neutral-400">{l.createdAt.toISOString().slice(0, 19).replace("T", " ")}</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Admin: {l.admin?.displayName ?? l.admin?.discordId ?? "system"} · Target: {l.targetType ?? "-"} {l.targetId ?? ""}
            </p>
            {l.ipHash && <p className="text-xs text-neutral-300">IP(hash): {l.ipHash}</p>}
          </div>
        ))}
        {logs.length === 0 && <p className="px-4 py-6 text-neutral-400">기록이 없습니다.</p>}
      </div>
    </div>
  );
}

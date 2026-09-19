import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/adminAuth";
import { hasPermission, ROLE_LABEL } from "@/lib/rbac";
import { addAdminAction, removeAdminAction, changeAdminRoleAction } from "@/lib/actions/adminManageWeb";
import type { AdminRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALL_ROLES: AdminRole[] = ["OWNER", "ADMIN", "MODERATOR", "REVIEWER", "AUDITOR"];
const ADDABLE_ROLES: AdminRole[] = ["ADMIN", "MODERATOR", "REVIEWER", "AUDITOR"];

export default async function AdminAdminsPage() {
  const admin = await requireAdmin();
  if (!hasPermission(admin.role, "MANAGE_ADMINS")) redirect("/admin");

  const admins = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-1">운영진 관리</h1>
      <p className="text-sm text-neutral-500 mb-4">
        웹 패널은 <strong>오너 / 어드민 / 매니저</strong> 역할만 로그인할 수 있습니다. 리뷰어/감사자는 디스코드 봇에서만 동작합니다.
      </p>

      <div className="bg-white rounded-xl border border-neutral-200 divide-y mb-6">
        {admins.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{a.displayName ?? a.discordId}</p>
              <p className="text-xs text-neutral-400">
                Discord: {a.discordId} {!a.active ? "· 비활성" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {a.role !== "OWNER" ? (
                <form action={changeAdminRoleAction.bind(null, a.id)} className="flex items-center gap-1">
                  <select name="role" defaultValue={a.role} className="text-xs border border-neutral-300 rounded px-1 py-1">
                    {ALL_ROLES.filter((r) => r !== "OWNER").map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <button className="text-xs px-2 py-1 rounded bg-neutral-800 text-white">저장</button>
                </form>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-neutral-100">{ROLE_LABEL[a.role]}</span>
              )}
              {a.role !== "OWNER" && a.active && (
                <form action={removeAdminAction.bind(null, a.id)}>
                  <button className="text-xs text-red-600">제거</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-neutral-500 mb-2">운영진 추가</h2>
      <form action={addAdminAction} className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Discord ID</label>
          <input name="discordId" required className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">역할</label>
          <select name="role" className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm">
            {ADDABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-neutral-400">
          추가된 사용자는 Discord로 로그인하면 자동으로 인식됩니다 (별도 비밀번호 설정 불필요).
        </p>
        <button className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm">추가/수정</button>
      </form>
    </div>
  );
}

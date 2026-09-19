"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/adminAuth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { AdminRole } from "@prisma/client";

export async function addAdminAction(formData: FormData) {
  const requester = await requireAdmin();
  requirePermission(requester.role, "MANAGE_ADMINS");

  const discordId = String(formData.get("discordId") ?? "").trim();
  const role = String(formData.get("role") ?? "REVIEWER") as AdminRole;
  if (!discordId) return;

  await prisma.adminUser.upsert({
    where: { discordId },
    create: { discordId, role, active: true },
    update: { role, active: true },
  });

  await logAudit({ actorId: requester.id, action: "ADMIN_ADD", targetType: "AdminUser", targetId: discordId, detail: { role } });
  revalidatePath("/admin/admins");
}

export async function removeAdminAction(adminId: string) {
  const requester = await requireAdmin();
  requirePermission(requester.role, "MANAGE_ADMINS");

  await prisma.adminUser.update({ where: { id: adminId }, data: { active: false } });
  await logAudit({ actorId: requester.id, action: "ADMIN_REMOVE", targetType: "AdminUser", targetId: adminId });
  revalidatePath("/admin/admins");
}

export async function changeAdminRoleAction(adminId: string, formData: FormData) {
  const requester = await requireAdmin();
  requirePermission(requester.role, "MANAGE_ADMINS");

  const role = String(formData.get("role") ?? "") as AdminRole;
  await prisma.adminUser.update({ where: { id: adminId }, data: { role } });
  await logAudit({ actorId: requester.id, action: "ADMIN_ROLE_CHANGE", targetType: "AdminUser", targetId: adminId, detail: { role } });
  revalidatePath("/admin/admins");
}

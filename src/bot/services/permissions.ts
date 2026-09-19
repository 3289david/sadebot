import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/rbac";
import type { AdminRole } from "@prisma/client";

export async function getAdminByDiscordId(discordId: string) {
  return prisma.adminUser.findUnique({ where: { discordId } });
}

export async function checkBotPermission(discordId: string, permission: Permission): Promise<{
  ok: boolean;
  role?: AdminRole;
  adminId?: string; // AdminUser.id (cuid) — AuditLog.actorId는 반드시 이 값을 써야 함 (discordId 아님)
}> {
  const admin = await getAdminByDiscordId(discordId);
  if (!admin || !admin.active) return { ok: false };
  return { ok: hasPermission(admin.role, permission), role: admin.role, adminId: admin.id };
}

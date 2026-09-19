import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/rbac";
import type { AdminRole } from "@prisma/client";

export async function getAdminByDiscordId(discordId: string) {
  return prisma.adminUser.findUnique({ where: { discordId } });
}

export async function checkBotPermission(discordId: string, permission: Permission): Promise<{
  ok: boolean;
  role?: AdminRole;
}> {
  const admin = await getAdminByDiscordId(discordId);
  if (!admin || !admin.active) return { ok: false };
  return { ok: hasPermission(admin.role, permission), role: admin.role };
}

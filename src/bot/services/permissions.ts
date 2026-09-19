import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/rbac";
import { botConfig } from "@/bot/config";
import type { AdminRole } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";

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

// 사기 DB/운영진 관리 명령어는 우리 서버(허브 길드)에서만 동작해야 한다.
// 길드 커맨드 등록 범위가 이를 1차로 막아주지만, 방어적으로 실행 시점에도 한 번 더 확인한다.
export async function requireHubGuild(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (!botConfig.guildId) return true; // 허브 길드 미설정 시(개발 환경 등) 제한하지 않음
  if (interaction.guildId !== botConfig.guildId) {
    await interaction.reply({ content: "⛔ 이 명령어는 사데봇 관리 서버에서만 사용할 수 있습니다.", flags: 64 });
    return false;
  }
  return true;
}

// 반대로 "안전서버 인증 신청/재인증"은 인증을 받으려는 다른(고객) 서버에서 실행해야 의미가 있다.
// 우리 서버(허브) 자신은 인증 대상이 아니므로 여기서는 신청을 막는다.
export async function requireNonHubGuild(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (!botConfig.guildId) return true;
  if (interaction.guildId === botConfig.guildId) {
    await interaction.reply({
      content: "ℹ️ 이 서버는 사데봇 관리 서버라 인증 대상이 아닙니다.\n인증을 받으려는 여러분의 서버에 사데봇을 초대한 뒤, 그 서버에서 이 명령어를 사용해주세요.",
      flags: 64,
    });
    return false;
  }
  return true;
}

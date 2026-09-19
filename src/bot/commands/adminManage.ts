import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { prisma } from "@/lib/prisma";
import { getAdminByDiscordId } from "@/bot/services/permissions";
import { logAudit } from "@/lib/audit";
import { ROLE_LABEL } from "@/lib/rbac";
import type { AdminRole } from "@prisma/client";

const ROLE_CHOICES: { name: string; value: AdminRole }[] = [
  { name: "Admin", value: "ADMIN" },
  { name: "Moderator", value: "MODERATOR" },
  { name: "Reviewer", value: "REVIEWER" },
  { name: "Auditor", value: "AUDITOR" },
];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("운영진설정")
    .setDescription("[Owner 전용] 운영진 권한을 관리합니다.")
    .addSubcommand((sub) =>
      sub
        .setName("추가")
        .setDescription("운영진을 추가합니다.")
        .addUserOption((opt) => opt.setName("대상").setDescription("추가할 사용자").setRequired(true))
        .addStringOption((opt) => opt.setName("역할").setDescription("부여할 역할").setRequired(true).addChoices(...ROLE_CHOICES)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("제거")
        .setDescription("운영진을 제거합니다.")
        .addUserOption((opt) => opt.setName("대상").setDescription("제거할 사용자").setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName("목록").setDescription("현재 운영진 목록을 봅니다.")),
  async execute(interaction) {
    const requester = await getAdminByDiscordId(interaction.user.id);
    if (!requester || requester.role !== "OWNER") {
      await interaction.reply({ content: "⛔ 이 명령어는 Owner만 사용할 수 있습니다.", flags: 64 });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "추가") {
      const target = interaction.options.getUser("대상", true);
      const role = interaction.options.getString("역할", true) as AdminRole;
      await prisma.adminUser.upsert({
        where: { discordId: target.id },
        create: { discordId: target.id, displayName: target.username, role },
        update: { role, active: true },
      });
      await logAudit({ actorId: requester.id, action: "ADMIN_ADD", targetType: "AdminUser", targetId: target.id, detail: { role } });
      await interaction.reply({ content: `✅ <@${target.id}> 님을 ${ROLE_LABEL[role]} 역할로 등록했습니다.`, flags: 64 });
      return;
    }

    if (sub === "제거") {
      const target = interaction.options.getUser("대상", true);
      await prisma.adminUser.updateMany({ where: { discordId: target.id }, data: { active: false } });
      await logAudit({ actorId: requester.id, action: "ADMIN_REMOVE", targetType: "AdminUser", targetId: target.id });
      await interaction.reply({ content: `✅ <@${target.id}> 님의 운영진 권한을 해제했습니다.`, flags: 64 });
      return;
    }

    if (sub === "목록") {
      const admins = await prisma.adminUser.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } });
      const lines = admins.map((a) => `• <@${a.discordId}> — ${ROLE_LABEL[a.role]}`).join("\n") || "등록된 운영진이 없습니다.";
      await interaction.reply({ content: `👮 운영진 목록\n\n${lines}`, flags: 64 });
    }
  },
};

export default command;

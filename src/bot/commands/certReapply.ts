import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { prisma } from "@/lib/prisma";
import { reapplyCertification, CERT_STATUS_LABEL } from "@/lib/certService";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("안전서버재인증")
    .setDescription("현재 서버의 안전거래 인증을 갱신 신청합니다. (서버 관리 권한 필요)")
    .setDMPermission(false),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "이 명령어는 서버 안에서만 사용할 수 있습니다.", flags: 64 });
      return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: "⛔ 이 서버의 '서버 관리' 권한이 있는 사용자만 신청할 수 있습니다.", flags: 64 });
      return;
    }

    const existing = await prisma.serverCertification.findUnique({ where: { guildId: interaction.guild.id } });
    if (!existing) {
      await interaction.reply({ content: "인증 신청 이력이 없습니다. `/안전서버인증신청` 을 먼저 사용해주세요.", flags: 64 });
      return;
    }

    await interaction.deferReply();
    const updated = await reapplyCertification({ guildId: interaction.guild.id, actorId: interaction.user.id });

    await interaction.editReply(
      [
        "🔄 **안전서버 재인증 신청 완료**",
        "",
        `인증번호: ${updated.certNumber}`,
        `현재 상태: ${CERT_STATUS_LABEL[updated.status]}`,
        "",
        "운영팀이 서버 정보를 다시 확인하고 새로 안전거래 테스트를 진행합니다.",
      ].join("\n"),
    );
  },
};

export default command;

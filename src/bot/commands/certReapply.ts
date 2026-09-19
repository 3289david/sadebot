import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { prisma } from "@/lib/prisma";
import { reapplyCertification, CERT_STATUS_LABEL } from "@/lib/certService";
import { userManagesGuild } from "@/lib/discordRest";
import { botConfig, buildBotInviteUrl } from "@/bot/config";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("안전서버재인증")
    .setDescription("서버의 안전거래 인증을 갱신 신청합니다. (서버 관리 권한 필요)")
    .addStringOption((opt) =>
      opt.setName("서버id").setDescription("우리 서버에서 신청할 때: 갱신할 여러분의 서버 ID").setRequired(false),
    )
    .setDMPermission(false),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "이 명령어는 서버 안에서만 사용할 수 있습니다.", flags: 64 });
      return;
    }

    const explicitGuildId = interaction.options.getString("서버id");
    const runningInHub = interaction.guildId === botConfig.guildId;
    let targetGuildId: string;

    if (!runningInHub) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: "⛔ 이 서버의 '서버 관리' 권한이 있는 사용자만 신청할 수 있습니다.", flags: 64 });
        return;
      }
      targetGuildId = interaction.guild.id;
    } else {
      if (!explicitGuildId) {
        await interaction.reply({
          content: `이 서버(허브)는 인증 대상이 아닙니다. \`서버id\` 옵션에 갱신할 여러분의 서버 ID를 입력해주세요. 봇 초대 링크: ${buildBotInviteUrl() ?? "(설정 필요)"}`,
          flags: 64,
        });
        return;
      }
      await interaction.deferReply({ flags: 64 });
      const check = await userManagesGuild(explicitGuildId, interaction.user.id);
      if (!check.guildName) {
        await interaction.editReply(`❌ 봇이 아직 그 서버(${explicitGuildId})에 없습니다.`);
        return;
      }
      if (!check.ok) {
        await interaction.editReply("⛔ 그 서버의 '서버 관리' 권한(또는 소유자)이 있어야 신청할 수 있습니다.");
        return;
      }
      targetGuildId = explicitGuildId;
    }

    const existing = await prisma.serverCertification.findUnique({ where: { guildId: targetGuildId } });
    if (!existing) {
      const msg = "인증 신청 이력이 없습니다. `/안전서버인증신청` 을 먼저 사용해주세요.";
      if (interaction.deferred) await interaction.editReply(msg);
      else await interaction.reply({ content: msg, flags: 64 });
      return;
    }

    if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
    const updated = await reapplyCertification({ guildId: targetGuildId, actorId: interaction.user.id });

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

import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { applyCertification, CERT_STATUS_LABEL } from "@/lib/certService";
import { requireNonHubGuild } from "@/bot/services/permissions";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("안전서버인증신청")
    .setDescription("현재 서버의 안전거래 인증을 신청합니다. (서버 관리 권한 필요)")
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
    if (!(await requireNonHubGuild(interaction))) return;

    await interaction.deferReply();
    const { cert, isNew } = await applyCertification({
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      applicantId: interaction.user.id,
    });

    if (!isNew) {
      await interaction.editReply(
        `이미 인증 신청 이력이 있는 서버입니다.\n\n인증번호: ${cert.certNumber}\n현재 상태: ${CERT_STATUS_LABEL[cert.status]}\n\n갱신하려면 \`/안전서버재인증\` 을 사용해주세요.`,
      );
      return;
    }

    await interaction.editReply(
      [
        "🛡️ **안전서버 인증**",
        "",
        "서버 인증 절차가 시작되었습니다.",
        "",
        `서버: ${interaction.guild.name}`,
        `서버 ID: ${interaction.guild.id}`,
        `인증번호: ${cert.certNumber}`,
        "",
        `현재 상태: ${CERT_STATUS_LABEL[cert.status]}`,
        "",
        "운영팀이 서버 기본 정보를 확인한 뒤, 사전에 정해진 절차에 따라 비공개 안전거래 테스트를 진행합니다.",
        "인증이 완료되면 안전서버 인증 배지를 사용할 수 있습니다.",
      ].join("\n"),
    );
  },
};

export default command;

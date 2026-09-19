import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { applyCertification, applyCertificationAsUser, CERT_STATUS_LABEL } from "@/lib/certService";
import { botConfig, buildBotInviteUrl } from "@/bot/config";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("안전서버인증신청")
    .setDescription("서버의 안전거래 인증을 신청합니다. (서버 관리 권한 필요)")
    .addStringOption((opt) =>
      opt
        .setName("서버id")
        .setDescription("우리 서버에서 신청할 때: 인증받을 여러분의 서버 ID (봇이 이미 초대되어 있어야 함)")
        .setRequired(false),
    )
    .setDMPermission(false),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "이 명령어는 서버 안에서만 사용할 수 있습니다.", flags: 64 });
      return;
    }

    const explicitGuildId = interaction.options.getString("서버id");
    const runningInHub = interaction.guildId === botConfig.guildId;

    if (!runningInHub) {
      // 일반적인 경우: 인증받으려는 서버 안에서 직접 실행
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: "⛔ 이 서버의 '서버 관리' 권한이 있는 사용자만 신청할 수 있습니다.", flags: 64 });
        return;
      }

      await interaction.deferReply();
      const { cert, isNew } = await applyCertification({
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        applicantId: interaction.user.id,
      });
      await interaction.editReply(formatApplyResult(isNew ? "created" : "already_exists", cert, interaction.guild.id, interaction.guild.name));
      return;
    }

    // 허브 서버 안에서: 서버id로 지정한 "본인 소유의 다른 서버"를 대신 인증 신청
    if (!explicitGuildId) {
      await interaction.reply({
        content: [
          "이 서버(허브)는 인증 대상이 아닙니다. 대신 아래 방법으로 **여러분의 서버**를 신청할 수 있습니다.",
          "",
          "1️⃣ `서버id` 옵션에 여러분의 서버 ID를 입력해서 이 명령어를 다시 실행 (봇이 그 서버에 먼저 초대되어 있어야 함)",
          `   봇 초대 링크: ${buildBotInviteUrl() ?? "(설정 필요)"}`,
          `2️⃣ #안전서버 채널의 '📝 여기서 신청' 버튼 사용`,
          `3️⃣ 웹에서 신청: ${botConfig.baseUrl}/certify (Discord 로그인 후 내 서버 목록에서 바로 신청)`,
        ].join("\n"),
        flags: 64,
      });
      return;
    }

    await interaction.deferReply({ flags: 64 });
    const result = await applyCertificationAsUser(explicitGuildId, interaction.user.id);
    await interaction.editReply(formatApplyResult(result.status, "cert" in result ? result.cert : null, explicitGuildId, "guildName" in result ? result.guildName : undefined));
  },
};

function formatApplyResult(
  status: "created" | "already_exists" | "no_permission" | "not_in_guild",
  cert: { certNumber: string; status: string } | null,
  guildId: string,
  guildName?: string,
): string {
  if (status === "not_in_guild") {
    return `❌ 봇이 아직 그 서버(${guildId})에 없습니다. 먼저 봇을 초대해주세요: ${buildBotInviteUrl() ?? "(설정 필요)"}`;
  }
  if (status === "no_permission") {
    return `⛔ '${guildName}' 서버의 '서버 관리' 권한(또는 소유자)이 있어야 신청할 수 있습니다.`;
  }
  if (status === "already_exists" && cert) {
    return `이미 인증 신청 이력이 있는 서버입니다.\n\n인증번호: ${cert.certNumber}\n현재 상태: ${CERT_STATUS_LABEL[cert.status as keyof typeof CERT_STATUS_LABEL]}\n\n갱신하려면 \`/안전서버재인증\` 을 사용해주세요.`;
  }
  if (cert) {
    return [
      "🛡️ **안전서버 인증**",
      "",
      "서버 인증 절차가 시작되었습니다.",
      "",
      `서버: ${guildName ?? guildId}`,
      `서버 ID: ${guildId}`,
      `인증번호: ${cert.certNumber}`,
      "",
      `현재 상태: ${CERT_STATUS_LABEL[cert.status as keyof typeof CERT_STATUS_LABEL]}`,
      "",
      "운영팀이 서버 기본 정보를 확인한 뒤, 사전에 정해진 절차에 따라 비공개 안전거래 테스트를 진행합니다.",
      "인증이 완료되면 안전서버 인증 배지를 사용할 수 있습니다.",
    ].join("\n");
  }
  return "처리 중 오류가 발생했습니다.";
}

export default command;
export { formatApplyResult };

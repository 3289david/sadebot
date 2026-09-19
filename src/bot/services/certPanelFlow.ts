import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { searchCertifications, applyCertificationAsUser, reapplyCertificationAsUser, CERT_STATUS_LABEL } from "@/lib/certService";
import { EMBED_COLOR } from "@/lib/constants";
import { botConfig, buildBotInviteUrl } from "@/bot/config";

export const CERT_SEARCH_MODAL_ID = "sadebot_cert_search_modal";
export const CERT_APPLY_HERE_MODAL_ID = "sadebot_cert_apply_here_modal";
export const CERT_REAPPLY_HERE_MODAL_ID = "sadebot_cert_reapply_here_modal";

function buildGuildIdModal(customId: string, title: string) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("guildId")
          .setLabel("여러분의 서버 ID (봇이 이미 초대되어 있어야 함)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(30),
      ),
    );
}

export async function handleCertApplyHereButton(interaction: ButtonInteraction) {
  await interaction.showModal(buildGuildIdModal(CERT_APPLY_HERE_MODAL_ID, "📝 안전서버 인증 신청"));
}

export async function handleCertReapplyHereButton(interaction: ButtonInteraction) {
  await interaction.showModal(buildGuildIdModal(CERT_REAPPLY_HERE_MODAL_ID, "🔄 안전서버 재인증"));
}

export async function handleCertApplyHereModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ flags: 64 });
  const guildId = interaction.fields.getTextInputValue("guildId").trim();
  const result = await applyCertificationAsUser(guildId, interaction.user.id);

  if (result.status === "not_in_guild") {
    await interaction.editReply(`❌ 봇이 아직 그 서버(${guildId})에 없습니다. 먼저 봇을 초대해주세요: ${buildBotInviteUrl() ?? "(설정 필요)"}`);
    return;
  }
  if (result.status === "no_permission") {
    await interaction.editReply(`⛔ '${result.guildName}' 서버의 '서버 관리' 권한(또는 소유자)이 있어야 신청할 수 있습니다.`);
    return;
  }
  if (result.status === "already_exists") {
    await interaction.editReply(
      `이미 인증 신청 이력이 있는 서버입니다.\n\n인증번호: ${result.cert.certNumber}\n현재 상태: ${CERT_STATUS_LABEL[result.cert.status]}`,
    );
    return;
  }
  await interaction.editReply(
    `🛡️ 인증 절차가 시작되었습니다.\n\n서버: ${result.cert.guildName}\n인증번호: ${result.cert.certNumber}\n현재 상태: ${CERT_STATUS_LABEL[result.cert.status]}`,
  );
}

export async function handleCertReapplyHereModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ flags: 64 });
  const guildId = interaction.fields.getTextInputValue("guildId").trim();
  const result = await reapplyCertificationAsUser(guildId, interaction.user.id);

  if (result.status === "not_in_guild") {
    await interaction.editReply(`❌ 봇이 아직 그 서버(${guildId})에 없습니다.`);
    return;
  }
  if (result.status === "no_permission") {
    await interaction.editReply(`⛔ '${result.guildName}' 서버의 '서버 관리' 권한(또는 소유자)이 있어야 신청할 수 있습니다.`);
    return;
  }
  if (result.status === "no_existing_cert") {
    await interaction.editReply(`'${result.guildName}' 서버는 인증 신청 이력이 없습니다. 먼저 신청해주세요.`);
    return;
  }
  await interaction.editReply(`🔄 재인증 신청 완료\n\n인증번호: ${result.cert.certNumber}\n현재 상태: ${CERT_STATUS_LABEL[result.cert.status]}`);
}

export function buildCertSearchModal() {
  return new ModalBuilder()
    .setCustomId(CERT_SEARCH_MODAL_ID)
    .setTitle("🔍 인증서버 검색")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("query")
          .setLabel("서버 이름 또는 인증번호")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100),
      ),
    );
}

export async function handleCertSearchButton(interaction: ButtonInteraction) {
  await interaction.showModal(buildCertSearchModal());
}

export async function handleCertSearchModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ flags: 64 });
  const query = interaction.fields.getTextInputValue("query").trim();
  const results = await searchCertifications(query);

  if (results.length === 0) {
    await interaction.editReply(`"${query}" 에 대한 인증서버 검색 결과가 없습니다.`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR.success)
    .setTitle("🔍 인증서버 검색 결과")
    .setDescription(`검색어: ${query}`);

  for (const c of results.slice(0, 10)) {
    embed.addFields({
      name: `${c.guildName ?? c.guildId} (${c.certNumber})`,
      value: [
        `상태: ${CERT_STATUS_LABEL[c.status]}`,
        c.expiresAt ? `만료일: ${c.expiresAt.toISOString().slice(0, 10)}` : null,
        `인증 페이지: ${botConfig.baseUrl}/server/${c.certNumber}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

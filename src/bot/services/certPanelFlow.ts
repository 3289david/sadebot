import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { searchCertifications, CERT_STATUS_LABEL } from "@/lib/certService";
import { EMBED_COLOR } from "@/lib/constants";
import { botConfig } from "@/bot/config";

export const CERT_SEARCH_MODAL_ID = "sadebot_cert_search_modal";

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

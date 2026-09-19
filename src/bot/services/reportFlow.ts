import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { extractLabeledLines, extractDamageAmount, guessDamageType, normalizeIdentifierValue } from "@/lib/extract";
import { createCase } from "@/bot/services/caseService";
import { checkReportRateLimit } from "@/lib/ratelimit";
import { buildAutoExtractEmbed, buildNewReportLogEmbed, buildDuplicateLinkEmbed, buildReceivedDmEmbed } from "@/bot/services/embeds";
import { safeSendDm } from "@/bot/services/dm";
import { createCaseEvidenceThread, createDisputeEvidenceThread } from "@/bot/services/evidenceThreadFlow";
import { botConfig } from "@/bot/config";
import { DAMAGE_TYPES } from "@/lib/constants";
import type { IdentifierType } from "@prisma/client";

export const REPORT_MODAL_ID = "sadebot_report_modal";
export const DISPUTE_MODAL_ID = "sadebot_dispute_modal";

export function buildReportModal() {
  return new ModalBuilder()
    .setCustomId(REPORT_MODAL_ID)
    .setTitle("🚨 사기 제보")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("damageType")
          .setLabel(`피해 유형 (예: ${DAMAGE_TYPES.slice(0, 3).join(" / ")})`)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(30),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("damageAmount")
          .setLabel("피해 금액 (숫자만, 예: 50000)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(15),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("사건 설명")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1500),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("identifiersText")
          .setLabel("상대방 정보 (한 줄에 하나씩, \"항목: 값\")")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setPlaceholder("디스코드ID: 123456789012345678\n전화번호: 010-1234-5678\n계좌번호: 국민은행 12345678901234\n이름: 홍길동")
          .setMaxLength(800),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("platform")
          .setLabel("관련 플랫폼 (예: Discord, OO거래사이트)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(50),
      ),
    );
}

export async function handleReportModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ flags: 64 });

  const rl = await checkReportRateLimit(interaction.user.id);
  if (!rl.allowed) {
    await interaction.editReply("⚠️ 신고 제한\n\n짧은 시간 동안 너무 많은 제보가 접수되었습니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  const damageType = interaction.fields.getTextInputValue("damageType").trim() || "기타";
  const amountRaw = interaction.fields.getTextInputValue("damageAmount").trim();
  const description = interaction.fields.getTextInputValue("description").trim();
  const identifiersText = interaction.fields.getTextInputValue("identifiersText").trim();
  const platform = interaction.fields.getTextInputValue("platform").trim() || null;

  const fullText = `${description}\n${identifiersText}`;
  // "항목: 값" 형식으로 직접 적은 줄만 인식한다 — 설명 본문에서 정규식으로 값을 추측하지 않는다.
  const extracted = extractLabeledLines(identifiersText);
  const damageAmount = amountRaw ? Number(amountRaw.replace(/[^0-9]/g, "")) || null : extractDamageAmount(description);
  const finalDamageType = DAMAGE_TYPES.includes(damageType) ? damageType : guessDamageType(description) ?? damageType;

  const { case: created, duplicateMatches } = await createCase({
    damageType: finalDamageType,
    damageAmount,
    occurredAt: null,
    description,
    platform,
    reporterDiscordId: interaction.user.id,
    reporterUsername: interaction.user.username,
    channelId: interaction.channelId ?? undefined,
    rawContent: fullText,
    autoExtracted: false,
    identifiers: extracted.map((e) => ({ type: e.type as IdentifierType, value: e.value, source: "MANUAL" as const })),
  });

  await interaction.editReply(
    `✅ 제보가 접수되었습니다.\n\n사건 번호: CASE #${created.caseNumber}\n현재 상태: 🟡 검토 중\n\n증거 자료는 아래 안내되는 채널/스레드에 첨부해주세요.`,
  );

  await safeSendDm(interaction.client, interaction.user.id, buildReceivedDmEmbed(created.caseNumber));

  if (botConfig.logChannelId) {
    try {
      const logChannel = await interaction.client.channels.fetch(botConfig.logChannelId);
      if (logChannel?.isTextBased() && "send" in logChannel) {
        const { buildReviewActionRow } = await import("@/bot/services/components");
        await logChannel.send({
          embeds: [
            buildNewReportLogEmbed({
              caseNumber: created.caseNumber,
              reporterTag: `<@${interaction.user.id}>`,
              damageType: finalDamageType,
              damageAmount,
              platform,
              autoIdentifierTypes: [...new Set(extracted.map((e) => e.type))],
              evidenceCount: 0,
            }),
          ],
          components: [buildReviewActionRow(created.id)],
        });

        if (extracted.length > 0 || damageAmount || finalDamageType) {
          await logChannel.send({ embeds: [buildAutoExtractEmbed(extracted, damageAmount, finalDamageType)] });
        }
        if (duplicateMatches.length > 0) {
          await logChannel.send({ embeds: [buildDuplicateLinkEmbed(duplicateMatches)] });
        }
      }
    } catch (err) {
      console.error("[reportFlow] log channel post failed", err);
    }
  }

  await createCaseEvidenceThread(interaction.client, created.caseNumber, created.id, interaction.user.id);
}

export function buildDisputeModal(caseNumber: string) {
  return new ModalBuilder()
    .setCustomId(`${DISPUTE_MODAL_ID}:${caseNumber}`)
    .setTitle(`⚖️ 이의제기 - CASE #${caseNumber}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("사유 (사실과 다름/잘못된 사람/거래완료/환불함 등)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("detail")
          .setLabel("상세 내용")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1500),
      ),
    );
}

const REASON_KEYWORD_MAP: [RegExp, string][] = [
  [/사실.?다름|사실.?아님/, "FACTUAL_ERROR"],
  [/사람.?다름|잘못된 사람|사람.?아님/, "WRONG_PERSON"],
  [/거래.?완료|정상.?거래/, "TRADE_COMPLETED"],
  [/환불/, "ALREADY_REFUNDED"],
  [/정보.?잘못|잘못.?등록/, "WRONG_INFO"],
  [/삭제/, "DELETE_REQUEST"],
];

export function guessDisputeReason(text: string): string {
  for (const [re, reason] of REASON_KEYWORD_MAP) {
    if (re.test(text)) return reason;
  }
  return "OTHER";
}

export async function handleDisputeModalSubmit(interaction: ModalSubmitInteraction, caseNumber: string) {
  const reasonText = interaction.fields.getTextInputValue("reason").trim();
  const detail = interaction.fields.getTextInputValue("detail").trim();
  await handleDisputeModalSubmitCore(interaction, caseNumber, reasonText, detail);
}

export const PANEL_SEARCH_MODAL_ID = "sadebot_panel_search_modal";
export const PANEL_DISPUTE_MODAL_ID = "sadebot_panel_dispute_modal";

export function buildPanelSearchModal() {
  return new ModalBuilder()
    .setCustomId(PANEL_SEARCH_MODAL_ID)
    .setTitle("🔎 사기 DB 검색")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("query").setLabel("검색어 (전화번호/계좌/닉네임 등)").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100),
      ),
    );
}

export async function handlePanelSearchModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ flags: 64 });
  const query = interaction.fields.getTextInputValue("query").trim();
  const { searchCases, logSearch } = await import("@/bot/services/caseService");
  const { buildSearchResultEmbed } = await import("@/bot/services/embeds");
  const { buildJoongnaLinkRow } = await import("@/bot/services/components");
  const results = await searchCases(query, { publicOnly: true });
  await logSearch("DISCORD");
  await interaction.editReply({ embeds: [buildSearchResultEmbed(query, results)], components: [buildJoongnaLinkRow(query)] });
}

export function buildPanelDisputeModal() {
  return new ModalBuilder()
    .setCustomId(PANEL_DISPUTE_MODAL_ID)
    .setTitle("⚖️ 이의제기")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("caseNumber").setLabel("사건번호 (예: A10291)").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(20),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("사유 (사실과 다름/잘못된 사람/거래완료 등)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("detail").setLabel("상세 내용").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1500),
      ),
    );
}

export async function handlePanelDisputeModalSubmit(interaction: ModalSubmitInteraction) {
  const caseNumber = interaction.fields.getTextInputValue("caseNumber").toUpperCase().replace(/^CASE#?/, "").trim();
  await handleDisputeModalSubmitCore(interaction, caseNumber, interaction.fields.getTextInputValue("reason").trim(), interaction.fields.getTextInputValue("detail").trim());
}

async function handleDisputeModalSubmitCore(interaction: ModalSubmitInteraction, caseNumber: string, reasonText: string, detail: string) {
  await interaction.deferReply({ flags: 64 });
  const { prisma } = await import("@/lib/prisma");
  const { logCaseEvent } = await import("@/lib/audit");

  const target = await prisma.case.findUnique({ where: { caseNumber } });
  if (!target) {
    await interaction.editReply(`❌ CASE #${caseNumber} 를 찾을 수 없습니다.`);
    return;
  }

  const reason = guessDisputeReason(reasonText) as never;
  const dispute = await prisma.dispute.create({
    data: { caseId: target.id, submitterId: interaction.user.id, reason, reasonDetail: `[${reasonText}] ${detail}` },
  });
  await prisma.case.update({ where: { id: target.id }, data: { status: "DISPUTED" } });
  await logCaseEvent({ caseId: target.id, event: "DISPUTE_FILED", actorId: interaction.user.id, detail: { disputeId: dispute.id } });

  await interaction.editReply(`⚖️ 이의제기가 접수되었습니다.\n\nCASE #${caseNumber}\n운영진 검토 후 결과가 안내됩니다.`);

  if (botConfig.logChannelId) {
    try {
      const logChannel = await interaction.client.channels.fetch(botConfig.logChannelId);
      if (logChannel?.isTextBased() && "send" in logChannel) {
        const { buildDisputeEmbed } = await import("@/bot/services/embeds");
        const { buildDisputeActionRow } = await import("@/bot/services/components");
        await logChannel.send({
          embeds: [buildDisputeEmbed({ caseNumber, reason, reasonDetail: detail, evidenceCount: 0, currentStatus: "DISPUTED" })],
          components: [buildDisputeActionRow(dispute.id)],
        });
      }
    } catch (err) {
      console.error("[dispute] log channel post failed", err);
    }
  }

  await createDisputeEvidenceThread(interaction.client, caseNumber, dispute.id, interaction.user.id);
}

export async function safeReplyEphemeral(interaction: ButtonInteraction | ChatInputCommandInteraction, content: string) {
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ content, flags: 64 });
  } else {
    await interaction.reply({ content, flags: 64 });
  }
}

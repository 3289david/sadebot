import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Message,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { extractAll, extractDamageAmount, guessDamageType, type ExtractedIdentifier } from "@/lib/extract";
import { checkBotPermission } from "@/bot/services/permissions";
import { createCase } from "@/bot/services/caseService";
import { buildAutoExtractEmbed, buildNewReportLogEmbed, buildDuplicateLinkEmbed, buildReceivedDmEmbed } from "@/bot/services/embeds";
import { buildReviewActionRow } from "@/bot/services/components";
import { safeSendDm } from "@/bot/services/dm";
import { botConfig } from "@/bot/config";
import type { IdentifierType } from "@prisma/client";

interface Draft {
  authorId: string;
  authorTag: string;
  channelId: string;
  messageId: string;
  rawContent: string;
  extracted: ExtractedIdentifier[];
  damageAmount: number | null;
  damageType: string | null;
}

const drafts = new Map<string, Draft>();
setInterval(() => drafts.clear(), 6 * 60 * 60 * 1000).unref?.();

const EXCLUDE = "autoextract_exclude";
const REGISTER = "autoextract_register";
const EDIT = "autoextract_edit";
const EDIT_MODAL = "autoextract_edit_modal";

export async function scanMessageForAutoExtract(message: Message) {
  if (message.author.bot) return;
  const content = message.content?.trim();
  if (!content || content.length < 8) return;

  const extracted = extractAll(content);
  const damageAmount = extractDamageAmount(content);
  const damageType = guessDamageType(content);
  if (extracted.length === 0 && !damageAmount && !damageType) return;

  const draftId = message.id;
  drafts.set(draftId, {
    authorId: message.author.id,
    authorTag: message.author.tag,
    channelId: message.channelId,
    messageId: message.id,
    rawContent: content,
    extracted,
    damageAmount,
    damageType,
  });

  const { ActionRowBuilder: ARB, ButtonBuilder, ButtonStyle } = await import("discord.js");
  const row = new ARB<InstanceType<typeof ButtonBuilder>>().addComponents(
    new ButtonBuilder().setCustomId(`${EDIT}:${draftId}`).setLabel("수정").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${EXCLUDE}:${draftId}`).setLabel("제외").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`${REGISTER}:${draftId}`).setLabel("등록").setStyle(ButtonStyle.Success),
  );

  await message.reply({
    content: "🚨 새로운 제보 감지 (자동 인식) — 운영진 확인이 필요합니다.",
    embeds: [buildAutoExtractEmbed(extracted, damageAmount, damageType)],
    components: [row],
  });
}

export const AUTO_EXTRACT_NAMESPACES = [EXCLUDE, REGISTER, EDIT, EDIT_MODAL];

export async function handleAutoExtractButton(interaction: ButtonInteraction, ns: string, draftId: string) {
  const perm = await checkBotPermission(interaction.user.id, "REVIEW_REPORT");
  if (!perm.ok) {
    await interaction.reply({ content: "⛔ 운영진만 처리할 수 있습니다.", flags: 64 });
    return;
  }
  const draft = drafts.get(draftId);
  if (!draft) {
    await interaction.reply({ content: "⚠️ 만료되었거나 이미 처리된 항목입니다.", flags: 64 });
    return;
  }

  if (ns === EXCLUDE) {
    drafts.delete(draftId);
    await interaction.update({ content: "❌ 제외되었습니다. (DB 미등록)", embeds: [], components: [] });
    return;
  }

  if (ns === EDIT) {
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(`${EDIT_MODAL}:${draftId}`)
        .setTitle("자동 인식 결과 수정")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("damageType")
              .setLabel("피해 유형")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(draft.damageType ?? ""),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("damageAmount")
              .setLabel("피해 금액 (숫자만)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(draft.damageAmount ? String(draft.damageAmount) : ""),
          ),
        ),
    );
    return;
  }

  if (ns === REGISTER) {
    await registerDraft(interaction, draft);
    drafts.delete(draftId);
  }
}

export async function handleAutoExtractEditModalSubmit(interaction: ModalSubmitInteraction, draftId: string) {
  const draft = drafts.get(draftId);
  if (!draft) {
    await interaction.reply({ content: "⚠️ 만료되었거나 이미 처리된 항목입니다.", flags: 64 });
    return;
  }
  const damageType = interaction.fields.getTextInputValue("damageType").trim() || draft.damageType;
  const amountRaw = interaction.fields.getTextInputValue("damageAmount").trim();
  const damageAmount = amountRaw ? Number(amountRaw.replace(/[^0-9]/g, "")) || null : draft.damageAmount;
  draft.damageType = damageType;
  draft.damageAmount = damageAmount;
  await registerDraft(interaction, draft);
  drafts.delete(draftId);
}

async function registerDraft(interaction: ButtonInteraction | ModalSubmitInteraction, draft: Draft) {
  await interaction.deferReply({ flags: 64 });

  const { case: created, duplicateMatches } = await createCase({
    damageType: draft.damageType ?? "기타",
    damageAmount: draft.damageAmount,
    occurredAt: null,
    description: draft.rawContent,
    platform: "Discord",
    reporterDiscordId: draft.authorId,
    reporterUsername: draft.authorTag,
    channelId: draft.channelId,
    messageId: draft.messageId,
    rawContent: draft.rawContent,
    autoExtracted: true,
    identifiers: draft.extracted.map((e) => ({ type: e.type as IdentifierType, value: e.value, source: "AUTO_EXTRACT" as const })),
  });

  await interaction.editReply(`✅ CASE #${created.caseNumber} 로 등록되었습니다. (검토 대기)`);
  await safeSendDm(interaction.client, draft.authorId, buildReceivedDmEmbed(created.caseNumber));

  if (botConfig.logChannelId) {
    const logChannel = await interaction.client.channels.fetch(botConfig.logChannelId).catch(() => null);
    if (logChannel?.isTextBased() && "send" in logChannel) {
      await logChannel.send({
        embeds: [
          buildNewReportLogEmbed({
            caseNumber: created.caseNumber,
            reporterTag: `<@${draft.authorId}>`,
            damageType: draft.damageType ?? "기타",
            damageAmount: draft.damageAmount,
            platform: "Discord",
            autoIdentifierTypes: [...new Set(draft.extracted.map((e) => e.type))],
            evidenceCount: 0,
          }),
        ],
        components: [buildReviewActionRow(created.id)],
      });
      if (duplicateMatches.length > 0) {
        await logChannel.send({ embeds: [buildDuplicateLinkEmbed(duplicateMatches)] });
      }
    }
  }

  if ("message" in interaction && interaction.message) {
    await interaction.message.edit({ components: [] }).catch(() => {});
  }
}

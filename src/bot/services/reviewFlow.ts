import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { prisma } from "@/lib/prisma";
import { checkBotPermission } from "@/bot/services/permissions";
import { changeCaseStatus, softDeleteCase } from "@/bot/services/caseService";
import { buildStatusChangeDmEmbed, buildDbRegisterLogEmbed, buildDeleteLogEmbed } from "@/bot/services/embeds";
import { safeSendDm } from "@/bot/services/dm";
import { logAudit, logCaseEvent } from "@/lib/audit";
import { IDENTIFIER_LABEL, STATUS_LABEL } from "@/lib/constants";
import type { CaseStatus } from "@prisma/client";

const NEEDINFO_MODAL_ID = "sadebot_needinfo_modal";
const REJECT_MODAL_ID = "sadebot_reject_modal";

const STATUS_BY_ACTION: Record<string, CaseStatus> = {
  approve: "VERIFIED",
  hold: "ON_HOLD",
  reject: "REJECTED",
  needinfo: "NEEDS_MORE_INFO",
};

export async function handleReviewButton(interaction: ButtonInteraction, caseId: string, action: string) {
  const perm = await checkBotPermission(interaction.user.id, "APPROVE_REJECT");
  if (!perm.ok || !perm.adminId) {
    await interaction.reply({ content: "⛔ 검토 권한이 없습니다.", flags: 64 });
    return;
  }

  if (action === "needinfo") {
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(`${NEEDINFO_MODAL_ID}:${caseId}`)
        .setTitle("추가자료 요청 메시지")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("message")
              .setLabel("제보자에게 전달할 메시지")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setPlaceholder("예: 거래 내역을 추가로 제출해주세요.")
              .setMaxLength(500),
          ),
        ),
    );
    return;
  }

  if (action === "reject") {
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(`${REJECT_MODAL_ID}:${caseId}`)
        .setTitle("반려 사유")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId("reason").setLabel("반려 사유").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500),
          ),
        ),
    );
    return;
  }

  await interaction.deferUpdate();
  const status = STATUS_BY_ACTION[action];
  if (!status) return;

  const result = await changeCaseStatus({ caseId, newStatus: status, actorId: perm.adminId });
  if (result.reporterDiscordId) {
    await safeSendDm(interaction.client, result.reporterDiscordId, buildStatusChangeDmEmbed({ caseNumber: (await prisma.case.findUnique({ where: { id: caseId } }))!.caseNumber, before: result.before, after: result.after }));
  }

  if (status === "VERIFIED") {
    const c = await prisma.case.findUnique({ where: { id: caseId }, include: { identifiers: true } });
    if (c && interaction.channel?.isSendable()) {
      await interaction.channel.send({
        embeds: [
          buildDbRegisterLogEmbed({
            caseNumber: c.caseNumber,
            reason: "운영진 승인",
            reviewerTag: `<@${interaction.user.id}>`,
            addedFields: c.identifiers.map((i) => IDENTIFIER_LABEL[i.type] ?? i.type),
          }),
        ],
      });
    }
  } else if (interaction.channel?.isSendable()) {
    await interaction.channel.send({ content: `상태 변경: ${STATUS_LABEL[result.before]} → ${STATUS_LABEL[result.after]} (by <@${interaction.user.id}>)` });
  }
}

export async function handleNeedInfoModalSubmit(interaction: ModalSubmitInteraction, caseId: string) {
  const perm = await checkBotPermission(interaction.user.id, "APPROVE_REJECT");
  if (!perm.ok || !perm.adminId) {
    await interaction.reply({ content: "⛔ 검토 권한이 없습니다.", flags: 64 });
    return;
  }
  await interaction.deferReply({ flags: 64 });
  const message = interaction.fields.getTextInputValue("message").trim();
  const result = await changeCaseStatus({ caseId, newStatus: "NEEDS_MORE_INFO", actorId: perm.adminId, message });
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (result.reporterDiscordId && c) {
    await safeSendDm(interaction.client, result.reporterDiscordId, buildStatusChangeDmEmbed({ caseNumber: c.caseNumber, before: result.before, after: result.after, message }));
  }
  await interaction.editReply(`✅ 추가자료 요청 메시지를 전송했습니다.`);
}

export async function handleRejectModalSubmit(interaction: ModalSubmitInteraction, caseId: string) {
  const perm = await checkBotPermission(interaction.user.id, "APPROVE_REJECT");
  if (!perm.ok || !perm.adminId) {
    await interaction.reply({ content: "⛔ 검토 권한이 없습니다.", flags: 64 });
    return;
  }
  await interaction.deferReply({ flags: 64 });
  const reason = interaction.fields.getTextInputValue("reason").trim();
  const result = await changeCaseStatus({ caseId, newStatus: "REJECTED", actorId: perm.adminId, message: reason });
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (result.reporterDiscordId && c) {
    await safeSendDm(interaction.client, result.reporterDiscordId, buildStatusChangeDmEmbed({ caseNumber: c.caseNumber, before: result.before, after: result.after, message: reason }));
  }
  await interaction.editReply(`✅ 반려 처리했습니다.`);
}

export async function handleCaseViewButton(interaction: ButtonInteraction, caseId: string) {
  const perm = await checkBotPermission(interaction.user.id, "VIEW_EVIDENCE");
  if (!perm.ok || !perm.adminId) {
    await interaction.reply({ content: "⛔ 열람 권한이 없습니다.", flags: 64 });
    return;
  }
  await logAudit({ actorId: perm.adminId, action: "CASE_VIEW", targetType: "Case", targetId: caseId });

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    include: { identifiers: true, evidence: true, reports: true, _count: { select: { reports: true, evidence: true, disputes: true } } },
  });
  if (!c) {
    await interaction.reply({ content: "사건을 찾을 수 없습니다.", flags: 64 });
    return;
  }

  const idLines = c.identifiers.map((i) => `• ${IDENTIFIER_LABEL[i.type] ?? i.type}: ${i.value} ${i.source === "AUTO_EXTRACT" ? "(자동)" : ""}`).join("\n") || "없음";
  await interaction.reply({
    content: [
      `**[관리자 전용 - 비마스킹] CASE #${c.caseNumber}**`,
      `상태: ${STATUS_LABEL[c.status] ?? c.status}`,
      `유형: ${c.damageType} / 금액: ${c.damageAmount?.toLocaleString() ?? "미상"}원`,
      `설명: ${c.description}`,
      ``,
      `**연관 식별자 (원본)**`,
      idLines,
      ``,
      `증거 ${c.evidence.length}개 · 제보 ${c.reports.length}건`,
    ].join("\n"),
    flags: 64,
  });
}

export async function handleDeleteCase(interaction: ButtonInteraction, caseId: string, reason: string) {
  const perm = await checkBotPermission(interaction.user.id, "DELETE_CASE");
  if (!perm.ok || !perm.adminId) {
    await interaction.reply({ content: "⛔ 삭제 권한이 없습니다.", flags: 64 });
    return;
  }
  const c = await softDeleteCase({ caseId, actorId: perm.adminId, reason });
  if (interaction.channel?.isSendable()) {
    await interaction.channel.send({ embeds: [buildDeleteLogEmbed({ caseNumber: c.caseNumber, actorTag: `<@${interaction.user.id}>`, reason })] });
  }
}

const DISPUTE_STATUS_BY_ACTION: Record<string, "RESOLVED_KEEP" | "RESOLVED_HIDE" | "RESOLVED_NEED_MORE_INFO" | "RESOLVED_DELETE"> = {
  keep: "RESOLVED_KEEP",
  hide: "RESOLVED_HIDE",
  needinfo: "RESOLVED_NEED_MORE_INFO",
  delete: "RESOLVED_DELETE",
};

export async function handleDisputeButton(interaction: ButtonInteraction, disputeId: string, action: string) {
  const perm = await checkBotPermission(interaction.user.id, "RESOLVE_DISPUTE");
  if (!perm.ok || !perm.adminId) {
    await interaction.reply({ content: "⛔ 이의제기 처리 권한이 없습니다.", flags: 64 });
    return;
  }
  await interaction.deferUpdate();

  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, include: { case: true } });
  if (!dispute) return;

  const newDisputeStatus = DISPUTE_STATUS_BY_ACTION[action];
  await prisma.dispute.update({
    where: { id: disputeId },
    data: { status: newDisputeStatus, resolvedById: perm.adminId, resolvedAt: new Date() },
  });

  if (action === "hide") {
    await prisma.case.update({ where: { id: dispute.caseId }, data: { isPublic: false, visibility: "HIDDEN" } });
    await logCaseEvent({ caseId: dispute.caseId, event: "DISPUTE_RESOLVED", actorId: perm.adminId, detail: { action } });
  } else if (action === "needinfo") {
    await changeCaseStatus({ caseId: dispute.caseId, newStatus: "NEEDS_MORE_INFO", actorId: perm.adminId });
  } else if (action === "delete") {
    await softDeleteCase({ caseId: dispute.caseId, actorId: perm.adminId, reason: "이의제기 확인 결과 - 잘못된 제보로 판단" });
  } else {
    await changeCaseStatus({ caseId: dispute.caseId, newStatus: "VERIFIED", actorId: perm.adminId });
  }

  await logAudit({ actorId: perm.adminId, action: "DISPUTE_RESOLVE", targetType: "Dispute", targetId: disputeId, detail: { action } });

  await safeSendDm(
    interaction.client,
    dispute.submitterId,
    buildStatusChangeDmEmbed({
      caseNumber: dispute.case.caseNumber,
      before: "DISPUTED",
      after: action === "keep" ? "VERIFIED" : action === "delete" ? "DELETED" : dispute.case.status,
      message: `이의제기 처리 결과: ${action}`,
    }),
  );

  if (interaction.channel?.isSendable()) {
    await interaction.channel.send({ content: `⚖️ 이의제기 처리 완료 (${action}) — CASE #${dispute.case.caseNumber} by <@${interaction.user.id}>` });
  }
}

export async function handleDuplicateButton(interaction: ButtonInteraction, newCaseId: string, existingCaseId: string, action: "link" | "separate") {
  const perm = await checkBotPermission(interaction.user.id, "REVIEW_REPORT");
  if (!perm.ok || !perm.adminId) {
    await interaction.reply({ content: "⛔ 권한이 없습니다.", flags: 64 });
    return;
  }
  await interaction.deferUpdate();

  await prisma.duplicateLink.updateMany({
    where: { caseAId: newCaseId, caseBId: existingCaseId },
    data: { status: action === "link" ? "LINKED" : "REJECTED" },
  });
  await logAudit({ actorId: perm.adminId, action: "DUPLICATE_RESOLVE", targetType: "Case", targetId: newCaseId, detail: { existingCaseId, action } });

  if (interaction.channel?.isSendable()) {
    await interaction.channel.send({
      content: action === "link" ? `🔗 사건이 연결되었습니다. (by <@${interaction.user.id}>)` : `사건을 별도로 유지합니다. (by <@${interaction.user.id}>)`,
    });
  }
}

export { NEEDINFO_MODAL_ID, REJECT_MODAL_ID };

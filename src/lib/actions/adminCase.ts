"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/adminAuth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { changeCaseStatus, softDeleteCase } from "@/bot/services/caseService";
import { notifyEvidenceThread, notifyDisputeEvidenceThread } from "@/bot/services/evidenceFlow";
import { sendDmViaRest } from "@/lib/discordRest";
import { postWebhookEmbed } from "@/lib/discordWebhook";
import { STATUS_LABEL, IDENTIFIER_LABEL } from "@/lib/constants";
import { logAudit, logCaseEvent } from "@/lib/audit";
import type { CaseStatus, DisputeStatus } from "@prisma/client";

async function notifyReporter(caseId: string, before: CaseStatus, after: CaseStatus, message?: string) {
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  const report = await prisma.report.findFirst({ where: { caseId }, orderBy: { createdAt: "asc" } });
  if (!c || !report?.reporterDiscordId) return;
  await sendDmViaRest(
    report.reporterDiscordId,
    "📢 제보 상태 변경",
    [
      { name: "CASE", value: `#${c.caseNumber}`, inline: true },
      { name: "이전", value: STATUS_LABEL[before] ?? before, inline: true },
      { name: "현재", value: STATUS_LABEL[after] ?? after, inline: true },
      ...(message ? [{ name: "운영진 메시지", value: message }] : []),
    ],
  );
}

export async function approveCaseAction(caseId: string) {
  const admin = await requireAdmin();
  requirePermission(admin.role, "APPROVE_REJECT");

  const before = await prisma.case.findUniqueOrThrow({ where: { id: caseId }, include: { identifiers: true } });
  const result = await changeCaseStatus({ caseId, newStatus: "VERIFIED", actorId: admin.id });
  await notifyReporter(caseId, result.before, result.after);
  await postWebhookEmbed(
    "📕 DB 등록",
    [
      { name: "Case", value: `#${before.caseNumber}`, inline: true },
      { name: "등록 사유", value: "운영진 승인 (웹)" },
      { name: "검토 담당자", value: admin.displayName ?? admin.discordId, inline: true },
      { name: "변경된 정보", value: before.identifiers.map((i) => `+ ${IDENTIFIER_LABEL[i.type] ?? i.type}`).join("\n") || "없음" },
    ],
    0x57f287,
  );
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/cases");
  revalidatePath("/admin");
}

export async function holdCaseAction(caseId: string) {
  const admin = await requireAdmin();
  requirePermission(admin.role, "APPROVE_REJECT");
  const result = await changeCaseStatus({ caseId, newStatus: "ON_HOLD", actorId: admin.id });
  await notifyReporter(caseId, result.before, result.after);
  revalidatePath(`/admin/cases/${caseId}`);
}

export async function rejectCaseAction(caseId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  const admin = await requireAdmin();
  requirePermission(admin.role, "APPROVE_REJECT");
  const result = await changeCaseStatus({ caseId, newStatus: "REJECTED", actorId: admin.id, message: reason });
  await notifyReporter(caseId, result.before, result.after, reason);
  revalidatePath(`/admin/cases/${caseId}`);
}

export async function needInfoCaseAction(caseId: string, formData: FormData) {
  const message = String(formData.get("message") ?? "").trim();
  const admin = await requireAdmin();
  requirePermission(admin.role, "APPROVE_REJECT");
  const result = await changeCaseStatus({ caseId, newStatus: "NEEDS_MORE_INFO", actorId: admin.id, message });
  await notifyReporter(caseId, result.before, result.after, message);
  await notifyEvidenceThread(caseId, result.reporterDiscordId, message);
  revalidatePath(`/admin/cases/${caseId}`);
}

export async function deleteCaseAction(caseId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  const admin = await requireAdmin();
  requirePermission(admin.role, "DELETE_CASE");
  const c = await softDeleteCase({ caseId, actorId: admin.id, reason });
  await postWebhookEmbed(
    "🗑️ DB 삭제",
    [
      { name: "CASE", value: `#${c.caseNumber}`, inline: true },
      { name: "삭제자", value: admin.displayName ?? admin.discordId, inline: true },
      { name: "삭제 사유", value: reason },
    ],
    0xed4245,
  );
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/cases");
}

export async function hideCaseAction(caseId: string) {
  const admin = await requireAdmin();
  requirePermission(admin.role, "HIDE_CASE");
  await prisma.case.update({ where: { id: caseId }, data: { isPublic: false, visibility: "HIDDEN" } });
  await logCaseEvent({ caseId, event: "HIDDEN", actorId: admin.id });
  await logAudit({ actorId: admin.id, action: "CASE_HIDE", targetType: "Case", targetId: caseId });
  revalidatePath(`/admin/cases/${caseId}`);
}

export async function editCaseFieldAction(caseId: string, formData: FormData) {
  const field = String(formData.get("field") ?? "") as "description" | "damageType" | "damageAmount" | "platform";
  const value = String(formData.get("value") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  const admin = await requireAdmin();
  requirePermission(admin.role, "EDIT_CASE");

  const before = await prisma.case.findUniqueOrThrow({ where: { id: caseId } });
  const data: Record<string, unknown> = {};
  if (field === "damageAmount") data.damageAmount = value ? Number(value.replace(/[^0-9]/g, "")) : null;
  else data[field] = value;

  await prisma.case.update({ where: { id: caseId }, data });
  await logCaseEvent({ caseId, event: "FIELD_EDITED", actorId: admin.id, detail: { field, before: String(before[field as keyof typeof before] ?? ""), after: value, reason } });
  await logAudit({ actorId: admin.id, action: "CASE_EDIT", targetType: "Case", targetId: caseId, detail: { field, reason } });
  await postWebhookEmbed(
    "📝 DB 수정",
    [
      { name: "CASE", value: `#${before.caseNumber}`, inline: true },
      { name: "변경 항목", value: field, inline: true },
      { name: "변경자", value: admin.displayName ?? admin.discordId, inline: true },
      { name: "변경 전", value: String(before[field as keyof typeof before] ?? "-") },
      { name: "변경 후", value: value || "-" },
      { name: "사유", value: reason || "-" },
    ],
    0xfaa61a,
  );
  revalidatePath(`/admin/cases/${caseId}`);
}

const DISPUTE_STATUS_MAP: Record<string, DisputeStatus> = {
  keep: "RESOLVED_KEEP",
  hide: "RESOLVED_HIDE",
  needinfo: "RESOLVED_NEED_MORE_INFO",
  delete: "RESOLVED_DELETE",
};

export async function resolveDisputeAction(disputeId: string, action: "keep" | "hide" | "needinfo" | "delete", formData?: FormData) {
  const admin = await requireAdmin();
  requirePermission(admin.role, "RESOLVE_DISPUTE");

  const message = String(formData?.get("message") ?? "").trim() || undefined;
  const dispute = await prisma.dispute.findUniqueOrThrow({ where: { id: disputeId }, include: { case: true } });
  await prisma.dispute.update({ where: { id: disputeId }, data: { status: DISPUTE_STATUS_MAP[action], resolvedById: admin.id, resolvedAt: new Date() } });

  if (action === "hide") {
    await prisma.case.update({ where: { id: dispute.caseId }, data: { isPublic: false, visibility: "HIDDEN" } });
  } else if (action === "needinfo") {
    await changeCaseStatus({ caseId: dispute.caseId, newStatus: "NEEDS_MORE_INFO", actorId: admin.id, message });
    await notifyDisputeEvidenceThread(disputeId, dispute.submitterId, message ?? "추가 증거 자료를 제출해주세요.");
  } else if (action === "delete") {
    await softDeleteCase({ caseId: dispute.caseId, actorId: admin.id, reason: "이의제기 확인 결과 - 잘못된 제보로 판단" });
  } else {
    await changeCaseStatus({ caseId: dispute.caseId, newStatus: "VERIFIED", actorId: admin.id });
  }

  await logAudit({ actorId: admin.id, action: "DISPUTE_RESOLVE", targetType: "Dispute", targetId: disputeId, detail: { action, message } });
  await sendDmViaRest(dispute.submitterId, "⚖️ 이의제기 처리 결과", [
    { name: "CASE", value: `#${dispute.case.caseNumber}`, inline: true },
    { name: "처리 결과", value: action },
    ...(message ? [{ name: "메시지", value: message }] : []),
  ]);

  revalidatePath("/admin/disputes");
  revalidatePath(`/admin/cases/${dispute.caseId}`);
}

export async function resolveDuplicateAction(newCaseId: string, existingCaseId: string, action: "link" | "separate") {
  const admin = await requireAdmin();
  requirePermission(admin.role, "REVIEW_REPORT");

  await prisma.duplicateLink.updateMany({
    where: { caseAId: newCaseId, caseBId: existingCaseId },
    data: { status: action === "link" ? "LINKED" : "REJECTED" },
  });
  await logAudit({ actorId: admin.id, action: "DUPLICATE_RESOLVE", targetType: "Case", targetId: newCaseId, detail: { existingCaseId, action } });
  revalidatePath(`/admin/cases/${newCaseId}`);
}

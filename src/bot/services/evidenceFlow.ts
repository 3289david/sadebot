import type { Message } from "discord.js";
import { prisma } from "@/lib/prisma";
import { saveEvidenceBuffer } from "@/lib/storage";
import { logCaseEvent } from "@/lib/audit";
import { sendChannelMessage } from "@/lib/discordRest";
import { botConfig } from "@/bot/config";

// 이 파일은 웹 대시보드(서버 액션)에서도 import되므로 discord.js를 값으로 import하지 않는다
// (게이트웨이 클라이언트가 필요한 스레드 "생성"은 evidenceThreadFlow.ts — 봇 전용 — 에 있다).
// 여기 있는 함수들은 REST/DB만으로 동작해서 어느 프로세스에서 호출해도 안전하다.

export async function handlePotentialEvidenceMessage(message: Message) {
  if (message.author.bot) return;
  if (!message.channel.isThread()) return;
  if (message.channel.parentId !== botConfig.evidenceChannelId) return;
  if (message.attachments.size === 0) return;

  const [targetCase, targetDispute] = await Promise.all([
    prisma.case.findUnique({ where: { evidenceThreadId: message.channel.id } }),
    prisma.dispute.findUnique({ where: { evidenceThreadId: message.channel.id } }),
  ]);
  if (!targetCase && !targetDispute) return;

  const caseId = targetCase?.id ?? targetDispute!.caseId;
  const disputeId = targetDispute?.id;

  for (const attachment of message.attachments.values()) {
    try {
      const res = await fetch(attachment.url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const saved = await saveEvidenceBuffer(buffer, attachment.name ?? "evidence");
      await prisma.evidence.create({
        data: {
          caseId,
          disputeId,
          type: "OTHER",
          storagePath: saved.storagePath,
          fileHash: saved.fileHash,
          fileName: attachment.name ?? "evidence",
          mimeType: attachment.contentType ?? undefined,
          sizeBytes: saved.sizeBytes,
          uploadedBy: message.author.id,
        },
      });
      await logCaseEvent({
        caseId,
        event: disputeId ? "DISPUTE_EVIDENCE_ADDED" : "EVIDENCE_ADDED",
        actorId: message.author.id,
        detail: { fileName: attachment.name, disputeId },
      });
      await message.react("✅").catch(() => {});
    } catch (err) {
      console.error("[evidenceFlow] failed to save attachment", err);
      await message.react("⚠️").catch(() => {});
    }
  }
}

// 운영진이 "추가자료 요청" 처리를 할 때(봇 버튼이든 웹 대시보드든) 호출한다.
// DM과 별개로, 실제로 파일을 올릴 수 있는 그 스레드 안에도 메시지를 남겨야
// 어디에 올려야 하는지 헷갈리지 않는다. 보관 중(archived)인 스레드라도 메시지를 보내면
// Discord가 자동으로 다시 활성화한다.
export async function notifyEvidenceThread(caseId: string, reporterDiscordId: string | null, message: string) {
  const c = await prisma.case.findUnique({ where: { id: caseId }, select: { evidenceThreadId: true } });
  if (!c?.evidenceThreadId) return false;
  const mention = reporterDiscordId ? `<@${reporterDiscordId}> ` : "";
  return sendChannelMessage(c.evidenceThreadId, `${mention}📢 **추가자료 요청**\n${message}`);
}

export async function notifyDisputeEvidenceThread(disputeId: string, submitterId: string, message: string) {
  const d = await prisma.dispute.findUnique({ where: { id: disputeId }, select: { evidenceThreadId: true } });
  if (!d?.evidenceThreadId) return false;
  return sendChannelMessage(d.evidenceThreadId, `<@${submitterId}> 📢 **추가자료 요청**\n${message}`);
}

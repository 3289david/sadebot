import { ChannelType, ThreadAutoArchiveDuration, type Client } from "discord.js";
import { prisma } from "@/lib/prisma";
import { botConfig } from "@/bot/config";

// 봇 프로세스 전용 — 스레드를 실제로 생성하려면 discord.js Client(게이트웨이 연결)가 필요하다.
// 웹 프로세스에서는 이 파일을 import하면 안 된다(discord.js 전체가 번들에 딸려 들어가 빌드가 깨짐).
// 증거 알림/수집처럼 REST만 있으면 되는 로직은 evidenceFlow.ts(웹에서도 안전) 쪽에 둔다.
async function createEvidenceThreadBase(client: Client, threadName: string, introMessage: string) {
  if (!botConfig.evidenceChannelId) return null;
  const evidenceChannel = await client.channels.fetch(botConfig.evidenceChannelId);
  if (!evidenceChannel?.isTextBased() || !("threads" in evidenceChannel) || evidenceChannel.type !== ChannelType.GuildText) return null;

  const msg = await evidenceChannel.send(`🗂️ ${threadName}`);
  const thread = await evidenceChannel.threads.create({
    name: threadName,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    startMessage: msg.id,
  });
  await thread.send(introMessage);
  return thread;
}

export async function createCaseEvidenceThread(client: Client, caseNumber: string, caseId: string, reporterId: string) {
  try {
    const thread = await createEvidenceThreadBase(
      client,
      `사건-${caseNumber}-증거`,
      `<@${reporterId}> 이 스레드에 증거 파일(채팅 캡처, 송금 내역, 거래 화면 등)을 첨부해서 보내주세요. 언제든 제출 가능합니다.`,
    );
    if (!thread) return;
    await prisma.case.update({ where: { id: caseId }, data: { evidenceThreadId: thread.id } });
  } catch (err) {
    console.error("[evidenceThreadFlow] case evidence thread creation failed", err);
  }
}

export async function createDisputeEvidenceThread(client: Client, caseNumber: string, disputeId: string, submitterId: string) {
  try {
    const thread = await createEvidenceThreadBase(
      client,
      `이의제기-${caseNumber}-증거`,
      `<@${submitterId}> 이의제기를 뒷받침할 증거 파일(거래 완료 내역, 환불 내역, 대화 내용 등)을 이 스레드에 첨부해서 보내주세요.`,
    );
    if (!thread) return;
    await prisma.dispute.update({ where: { id: disputeId }, data: { evidenceThreadId: thread.id } });
  } catch (err) {
    console.error("[evidenceThreadFlow] dispute evidence thread creation failed", err);
  }
}

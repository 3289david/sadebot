import { prisma } from "@/lib/prisma";
import { generateCertNumber } from "@/lib/certNumber";
import { fetchGuild, fetchGuildChannels, sendChannelEmbed, sendDmViaRest } from "@/lib/discordRest";
import { logAudit } from "@/lib/audit";
import { botConfig } from "@/bot/config";
import type { CertStatus, CertTestType, CertTestResult } from "@prisma/client";

const DISCORD_EPOCH = BigInt(1420070400000);

export function snowflakeToDate(id: string): Date {
  const ms = BigInt(id) / BigInt(4194304) + DISCORD_EPOCH; // >> 22 == / 2^22
  return new Date(Number(ms));
}

const CHANNEL_KEYWORDS: Record<string, string[]> = {
  hasTradeChannel: ["거래", "주문", "구매", "상점", "샵"],
  hasRefundChannel: ["환불", "취소"],
  hasTermsChannel: ["약관", "정책", "이용"],
  hasInquiryChannel: ["문의", "티켓", "상담"],
};

export const MANUAL_TEST_TYPES: CertTestType[] = [
  "ORDER_PROCESSING", "PAYMENT_PROCESSING", "PRODUCT_DELIVERY", "TRADE_COMPLIANCE",
  "INQUIRY_RESPONSE", "REFUND_POLICY", "POST_SALE_SUPPORT", "TERMS_POLICY",
];

export async function searchCertifications(query: string) {
  const q = query.trim();
  if (!q) return [];
  return prisma.serverCertification.findMany({
    where: {
      OR: [
        { guildName: { contains: q, mode: "insensitive" } },
        { certNumber: { equals: q.toUpperCase() } },
        { guildId: { equals: q } },
      ],
    },
    orderBy: { appliedAt: "desc" },
    take: 20,
  });
}

export async function runAutoCheck(guildId: string) {
  const guild = await fetchGuild(guildId);
  const channels = await fetchGuildChannels(guildId);
  const botInstalled = guild !== null;

  const channelNames = (channels ?? []).map((c) => c.name);
  const flags: Record<string, boolean> = {};
  for (const [key, keywords] of Object.entries(CHANNEL_KEYWORDS)) {
    flags[key] = channelNames.some((name) => keywords.some((k) => name.includes(k)));
  }

  return {
    botInstalled,
    guildName: guild?.name ?? null,
    guildCreatedAt: snowflakeToDate(guildId).toISOString(),
    channelCount: channels?.length ?? 0,
    ...flags,
    checkedAt: new Date().toISOString(),
  };
}

export async function applyCertification(params: { guildId: string; guildName: string; applicantId: string }) {
  const existing = await prisma.serverCertification.findUnique({ where: { guildId: params.guildId } });
  if (existing) return { cert: existing, isNew: false };

  const certNumber = await generateCertNumber();
  const autoCheckResult = await runAutoCheck(params.guildId);

  const cert = await prisma.serverCertification.create({
    data: {
      certNumber,
      guildId: params.guildId,
      guildName: params.guildName,
      applicantId: params.applicantId,
      status: autoCheckResult.botInstalled ? "INFO_CHECK" : "PENDING",
      autoCheckResult,
    },
  });

  await prisma.certEvent.create({
    data: { certId: cert.id, event: "APPLIED", actorId: params.applicantId, detail: { autoCheckResult } },
  });

  for (const t of MANUAL_TEST_TYPES) {
    await prisma.certTestItem.create({ data: { certId: cert.id, testType: t } });
  }
  await prisma.certTestItem.upsert({
    where: { certId_testType: { certId: cert.id, testType: "BOT_INSTALLED" } },
    create: { certId: cert.id, testType: "BOT_INSTALLED", auto: true, result: autoCheckResult.botInstalled ? "PASS" : "FAIL", testedAt: new Date() },
    update: { result: autoCheckResult.botInstalled ? "PASS" : "FAIL", testedAt: new Date() },
  });

  if (botConfig.logChannelId) {
    await sendChannelEmbed(
      botConfig.logChannelId,
      "🛡️ 안전서버 인증 신청",
      [
        { name: "서버", value: params.guildName, inline: true },
        { name: "서버 ID", value: params.guildId, inline: true },
        { name: "인증번호", value: cert.certNumber, inline: true },
        { name: "신청자", value: `<@${params.applicantId}>`, inline: true },
        { name: "현재 상태", value: cert.status },
      ],
      0xfaa61a,
    );
  }

  return { cert, isNew: true };
}

export async function reapplyCertification(params: { guildId: string; actorId: string }) {
  const cert = await prisma.serverCertification.findUniqueOrThrow({ where: { guildId: params.guildId } });
  const autoCheckResult = await runAutoCheck(params.guildId);

  const updated = await prisma.serverCertification.update({
    where: { id: cert.id },
    data: { status: "INFO_CHECK", autoCheckResult, expiryNotifiedAt: null },
  });
  await prisma.certEvent.create({ data: { certId: cert.id, event: "RENEWED", actorId: params.actorId, detail: { autoCheckResult } } });

  // 테스트 항목 초기화 (재인증은 새로 검증)
  await prisma.certTestItem.updateMany({
    where: { certId: cert.id, auto: false },
    data: { result: "NA", note: null, testedAt: null, testedById: null },
  });

  return updated;
}

export function pickRandomTestPlan(count = 3): CertTestType[] {
  const pool = [...MANUAL_TEST_TYPES];
  const picked: CertTestType[] = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

export async function recordTestResult(params: {
  certId: string;
  testType: CertTestType;
  result: CertTestResult;
  note?: string;
  actorId: string;
}) {
  await prisma.certTestItem.update({
    where: { certId_testType: { certId: params.certId, testType: params.testType } },
    data: { result: params.result, note: params.note, testedById: params.actorId, testedAt: new Date() },
  });
  await prisma.certEvent.create({
    data: { certId: params.certId, event: "TEST_RECORDED", actorId: params.actorId, detail: { testType: params.testType, result: params.result, note: params.note } },
  });
}

const STATUS_LABEL_KO: Record<CertStatus, string> = {
  PENDING: "🟡 인증 대기",
  INFO_CHECK: "🟡 정보 확인중",
  TESTING: "🟡 테스트 진행중",
  REVIEW: "🟠 검토중",
  ACTIVE: "🟢 인증 완료",
  EXPIRED: "🟡 인증 만료",
  REVOKED: "🔴 인증 취소",
  SUSPENDED: "⚫ 인증 정지",
};
export { STATUS_LABEL_KO as CERT_STATUS_LABEL };

export async function changeCertStatus(params: { certId: string; newStatus: CertStatus; actorId: string; reason?: string }) {
  const before = await prisma.serverCertification.findUniqueOrThrow({ where: { id: params.certId } });

  const becomingActive = params.newStatus === "ACTIVE";
  const now = new Date();
  const expiresAt = becomingActive ? new Date(now.getTime() + before.certPeriodDays * 24 * 60 * 60 * 1000) : before.expiresAt;

  const updated = await prisma.serverCertification.update({
    where: { id: params.certId },
    data: {
      status: params.newStatus,
      verifiedAt: becomingActive ? now : before.verifiedAt,
      lastVerifiedAt: becomingActive ? now : before.lastVerifiedAt,
      expiresAt,
      expiryNotifiedAt: becomingActive ? null : before.expiryNotifiedAt,
      revokedReason: params.newStatus === "REVOKED" || params.newStatus === "SUSPENDED" ? params.reason : before.revokedReason,
    },
  });

  await prisma.certEvent.create({
    data: { certId: params.certId, event: "STATUS_CHANGED", actorId: params.actorId, detail: { before: before.status, after: params.newStatus, reason: params.reason } },
  });
  if (params.actorId !== "system") {
    await logAudit({
      actorId: params.actorId,
      action: "CERT_STATUS_CHANGE",
      targetType: "ServerCertification",
      targetId: params.certId,
      detail: { before: before.status, after: params.newStatus },
    });
  }

  if (botConfig.logChannelId) {
    await sendChannelEmbed(
      botConfig.logChannelId,
      "🛡️ 안전서버 상태 변경",
      [
        { name: "서버", value: updated.guildName ?? updated.guildId, inline: true },
        { name: "인증번호", value: updated.certNumber, inline: true },
        { name: "이전", value: STATUS_LABEL_KO[before.status], inline: true },
        { name: "현재", value: STATUS_LABEL_KO[params.newStatus], inline: true },
        ...(params.reason ? [{ name: "사유", value: params.reason }] : []),
        { name: "처리자", value: params.actorId === "system" ? "시스템 자동 처리" : `<@${params.actorId}>`, inline: true },
      ],
      0x5865f2,
    );
  }

  await sendDmViaRest(
    updated.applicantId,
    "🛡️ 안전서버 인증 상태 알림",
    [
      { name: "서버", value: updated.guildName ?? updated.guildId, inline: true },
      { name: "인증번호", value: updated.certNumber, inline: true },
      { name: "현재 상태", value: STATUS_LABEL_KO[params.newStatus] },
    ],
    0x5865f2,
    params.reason,
  );

  return updated;
}

export async function checkExpiringAndExpired() {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const expiringSoon = await prisma.serverCertification.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: sevenDaysLater, gt: now }, expiryNotifiedAt: null },
  });
  for (const cert of expiringSoon) {
    const daysLeft = Math.ceil((cert.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    await sendDmViaRest(
      cert.applicantId,
      "🛡️ 인증 만료 예정 알림",
      [
        { name: "서버", value: cert.guildName ?? cert.guildId, inline: true },
        { name: "인증번호", value: cert.certNumber, inline: true },
      ],
      0xfaa61a,
      `현재 서버의 안전서버 인증이 ${daysLeft}일 후 만료됩니다. 디스코드에서 \`/안전서버재인증\` 으로 재신청할 수 있습니다.`,
    );
    await prisma.serverCertification.update({ where: { id: cert.id }, data: { expiryNotifiedAt: now } });
  }

  const expired = await prisma.serverCertification.findMany({ where: { status: "ACTIVE", expiresAt: { lte: now } } });
  for (const cert of expired) {
    await changeCertStatus({ certId: cert.id, newStatus: "EXPIRED", actorId: "system", reason: "인증 기간 만료" });
  }

  return { expiringSoon: expiringSoon.length, expired: expired.length };
}

import { prisma } from "@/lib/prisma";
import { generateCaseNumber } from "@/lib/caseNumber";
import { logCaseEvent, logAudit } from "@/lib/audit";
import { normalizeIdentifierValue, type ExtractedIdentifier } from "@/lib/extract";
import { findDuplicateMatches, recordDuplicateLinks } from "@/lib/duplicates";
import { maskByType } from "@/lib/mask";
import { IDENTIFIER_LABEL } from "@/lib/constants";
import { sendChannelEmbed, sendDmViaRest } from "@/lib/discordRest";
import { botConfig } from "@/bot/config";
import type { IdentifierType, CaseStatus } from "@prisma/client";

export interface NewCaseInput {
  damageType: string;
  damageAmount: number | null;
  occurredAt: Date | null;
  description: string;
  platform: string | null;
  reporterDiscordId?: string;
  reporterUsername?: string;
  channelId?: string;
  messageId?: string;
  rawContent?: string;
  autoExtracted: boolean;
  identifiers: { type: IdentifierType; value: string; source: "MANUAL" | "AUTO_EXTRACT" }[];
}

export async function createCase(input: NewCaseInput) {
  const caseNumber = await generateCaseNumber();

  const created = await prisma.case.create({
    data: {
      caseNumber,
      status: "RECEIVED",
      damageType: input.damageType,
      damageAmount: input.damageAmount,
      occurredAt: input.occurredAt,
      description: input.description,
      platform: input.platform,
      isPublic: false,
      visibility: "PENDING",
      reports: {
        create: {
          reporterDiscordId: input.reporterDiscordId,
          reporterUsername: input.reporterUsername,
          channelId: input.channelId,
          messageId: input.messageId,
          rawContent: input.rawContent,
          autoExtracted: input.autoExtracted,
        },
      },
      identifiers: {
        create: input.identifiers.map((i) => ({
          type: i.type,
          value: i.value,
          normalized: normalizeIdentifierValue(i.type, i.value),
          source: i.source,
        })),
      },
    },
    include: { identifiers: true },
  });

  await logCaseEvent({ caseId: created.id, event: "RECEIVED", actorId: input.reporterDiscordId, detail: { channel: input.channelId, message: input.messageId } });
  if (input.autoExtracted) {
    await logCaseEvent({ caseId: created.id, event: "AUTO_EXTRACTED", detail: { identifierCount: input.identifiers.length } });
  }

  const matches = await findDuplicateMatches(
    created.id,
    created.identifiers.map((i) => ({ type: i.type, normalized: i.normalized })),
  );
  if (matches.length > 0) {
    await recordDuplicateLinks(created.id, matches);
  }

  // 당사자 알림: 신고된 대상의 Discord ID를 식별할 수 있으면 접수 사실과 이의제기 방법을 미리 안내한다
  // (사실관계가 다를 경우 조기에 소명할 수 있도록 하는 절차적 안전장치 — 스펙 25번).
  const targetDiscordIds = created.identifiers
    .filter((i) => i.type === "DISCORD_ID" && i.value !== input.reporterDiscordId)
    .map((i) => i.value);
  for (const targetId of new Set(targetDiscordIds)) {
    await sendDmViaRest(
      targetId,
      "📢 거래 관련 제보 안내",
      [
        { name: "CASE", value: `#${created.caseNumber}`, inline: true },
        { name: "현재 상태", value: "🟡 검토 중", inline: true },
      ],
      0x5865f2,
      "귀하와 관련된 거래 제보가 접수되었습니다. 사실관계가 다를 경우 `/이의제기` 명령어로 소명할 수 있습니다.\n아직 운영진 검토 전이며, 이 알림은 사실 확정을 의미하지 않습니다.",
    );
  }

  return { case: created, duplicateMatches: matches };
}

export function convertExtractedToIdentifiers(extracted: ExtractedIdentifier[]) {
  return extracted.map((e) => ({ type: e.type as IdentifierType, value: e.value, source: "AUTO_EXTRACT" as const }));
}

export async function changeCaseStatus(params: {
  caseId: string;
  newStatus: CaseStatus;
  actorId: string;
  message?: string;
}) {
  const before = await prisma.case.findUniqueOrThrow({ where: { id: params.caseId } });
  const updated = await prisma.case.update({
    where: { id: params.caseId },
    data: {
      status: params.newStatus,
      isPublic: params.newStatus === "VERIFIED" ? true : before.isPublic,
      visibility: params.newStatus === "VERIFIED" ? "PUBLIC" : before.visibility,
    },
  });

  await logCaseEvent({
    caseId: params.caseId,
    event: "STATUS_CHANGED",
    actorId: params.actorId,
    detail: { before: before.status, after: params.newStatus, message: params.message },
  });
  await logAudit({
    actorId: params.actorId,
    action: "CASE_STATUS_CHANGE",
    targetType: "Case",
    targetId: params.caseId,
    detail: { before: before.status, after: params.newStatus },
  });

  if (params.newStatus === "VERIFIED" && before.status !== "VERIFIED" && botConfig.addedScammerChannelId) {
    const identifiers = await prisma.caseIdentifier.findMany({ where: { caseId: params.caseId } });
    await sendChannelEmbed(
      botConfig.addedScammerChannelId,
      "📕 새로운 사기꾼이 등록되었습니다",
      [
        { name: "CASE", value: `#${updated.caseNumber}`, inline: true },
        { name: "유형", value: updated.damageType, inline: true },
        { name: "피해금액", value: updated.damageAmount ? `₩${updated.damageAmount.toLocaleString()}` : "미상", inline: true },
        {
          name: "연관 정보 (전화번호·계좌번호만 마스킹)",
          value: identifiers.map((i) => `• ${IDENTIFIER_LABEL[i.type] ?? i.type}: ${maskByType(i.type, i.value)}`).join("\n") || "없음",
        },
        { name: "상세보기", value: `${botConfig.baseUrl}/case/${updated.caseNumber}` },
      ],
      0x57f287,
    );
  }

  const reporter = await prisma.report.findFirst({ where: { caseId: params.caseId }, orderBy: { createdAt: "asc" } });
  return { before: before.status, after: updated.status, reporterDiscordId: reporter?.reporterDiscordId ?? null };
}

export async function softDeleteCase(params: { caseId: string; actorId: string; reason: string }) {
  const c = await prisma.case.update({
    where: { id: params.caseId },
    data: { status: "DELETED", isPublic: false, visibility: "HIDDEN", deletedAt: new Date(), deletedById: params.actorId, deleteReason: params.reason },
  });
  await logCaseEvent({ caseId: params.caseId, event: "DELETED", actorId: params.actorId, detail: { reason: params.reason } });
  await logAudit({ actorId: params.actorId, action: "CASE_DELETE", targetType: "Case", targetId: params.caseId, detail: { reason: params.reason } });
  return c;
}

// 제보자가 적은 "상대방 정보" 원문은 자동으로 항목을 판단하지 않는다 — 관리자가 관리자 패널에서
// 한 줄씩 확인해 어떤 항목(전화번호/계좌/디스코드ID 등)인지 직접 판단한 뒤 이 함수로 등록한다.
export async function addCaseIdentifier(params: { caseId: string; type: IdentifierType; value: string; actorId: string }) {
  const normalized = normalizeIdentifierValue(params.type, params.value);
  const existing = await prisma.caseIdentifier.findFirst({ where: { caseId: params.caseId, type: params.type, normalized } });
  if (existing) return existing;

  const created = await prisma.caseIdentifier.create({
    data: { caseId: params.caseId, type: params.type, value: params.value, normalized, source: "MANUAL" },
  });
  await logCaseEvent({
    caseId: params.caseId,
    event: "IDENTIFIER_ADDED",
    actorId: params.actorId,
    detail: { type: params.type, value: params.value },
  });

  const matches = await findDuplicateMatches(params.caseId, [{ type: created.type, normalized: created.normalized }]);
  if (matches.length > 0) await recordDuplicateLinks(params.caseId, matches);

  return created;
}

// 접수 직후(RECEIVED) 상태는 운영진이 아직 한 번도 보지 않은 상태이므로 공개 검색에서 제외한다.
// 반려/삭제된 사건도 노출하지 않는다.
export const PUBLIC_SEARCHABLE_STATUSES: CaseStatus[] = [
  "REVIEWING", "NEEDS_MORE_INFO", "VERIFIED", "DISPUTED", "ON_HOLD", "EXPLAINED",
];

// 상태가 공개 대상이어도, 이의제기 처리 등으로 "임시 비공개(HIDDEN)" 처리된 사건은 검색/조회 어디서도
// 보이면 안 된다. 봇(/검색, /사건)과 웹(/search, /case/[번호])이 반드시 이 한 곳만 써서 공개 여부를 판단한다 —
// 예전에는 각자 status만 확인하고 visibility를 보지 않아, 임시 비공개해도 실제로는 계속 검색에 노출되는 버그가 있었다.
export function publicCaseWhere() {
  return { status: { in: PUBLIC_SEARCHABLE_STATUSES }, visibility: { not: "HIDDEN" } } as const;
}

export async function logSearch(source: "DISCORD" | "WEB") {
  await prisma.searchLog.create({ data: { source } });
}

export async function searchCases(query: string, opts: { publicOnly: boolean }) {
  const normalized = query.trim().toLowerCase();
  const digitsOnly = query.replace(/[^0-9]/g, "");

  const caseByNumber = await prisma.case.findFirst({
    where: {
      caseNumber: query.toUpperCase().replace(/^CASE#?/, "").trim(),
      ...(opts.publicOnly ? publicCaseWhere() : {}),
    },
  });

  const identifierHits = await prisma.caseIdentifier.findMany({
    where: {
      AND: [
        {
          OR: [
            { normalized },
            digitsOnly.length >= 4 ? { normalized: digitsOnly } : undefined,
            { normalized: { contains: normalized } },
          ].filter(Boolean) as object[],
        },
        opts.publicOnly ? { case: publicCaseWhere() } : {},
      ],
    },
    include: {
      case: {
        include: {
          identifiers: true,
          _count: { select: { reports: true, evidence: true, disputes: true } },
        },
      },
    },
    take: 50,
  });

  const byCaseId = new Map<string, { case: (typeof identifierHits)[number]["case"]; matched: { type: string; value: string }[] }>();
  for (const hit of identifierHits) {
    const entry = byCaseId.get(hit.case.id) ?? { case: hit.case, matched: [] };
    entry.matched.push({ type: hit.type, value: hit.value });
    byCaseId.set(hit.case.id, entry);
  }
  if (caseByNumber && !byCaseId.has(caseByNumber.id)) {
    const full = await prisma.case.findUnique({
      where: { id: caseByNumber.id },
      include: { identifiers: true, _count: { select: { reports: true, evidence: true, disputes: true } } },
    });
    if (full) byCaseId.set(full.id, { case: full, matched: full.identifiers.map((i) => ({ type: i.type, value: i.value })) });
  }

  const results = [...byCaseId.values()].map(({ case: c, matched }) => ({
    caseNumber: c.caseNumber,
    status: c.status,
    damageType: c.damageType,
    damageAmount: c.damageAmount,
    platform: c.platform,
    createdAt: c.createdAt,
    _count: c._count,
    matchedIdentifiers: matched,
  }));

  // 검색 결과에 연관된 Discord 서버가 안전서버 인증을 보유하고 있으면 배지 정보를 함께 붙인다 (스펙 15번).
  const guildIds = [...new Set(results.flatMap((r) => r.matchedIdentifiers.filter((m) => m.type === "DISCORD_SERVER").map((m) => m.value)))];
  const certs = guildIds.length
    ? await prisma.serverCertification.findMany({ where: { guildId: { in: guildIds } }, select: { guildId: true, certNumber: true, status: true, guildName: true } })
    : [];
  const certByGuild = new Map(certs.map((c) => [c.guildId, c]));

  return results.map((r) => ({
    ...r,
    serverCert: r.matchedIdentifiers
      .filter((m) => m.type === "DISCORD_SERVER")
      .map((m) => certByGuild.get(m.value))
      .find((c): c is NonNullable<typeof c> => Boolean(c)) ?? null,
  }));
}

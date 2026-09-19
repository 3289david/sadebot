import { prisma } from "@/lib/prisma";
import { generateCaseNumber } from "@/lib/caseNumber";
import { logCaseEvent, logAudit } from "@/lib/audit";
import { normalizeIdentifierValue, type ExtractedIdentifier } from "@/lib/extract";
import { findDuplicateMatches, recordDuplicateLinks } from "@/lib/duplicates";
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

// 접수 직후(RECEIVED) 상태는 운영진이 아직 한 번도 보지 않은 상태이므로 공개 검색에서 제외한다.
// 반려/삭제된 사건도 노출하지 않는다.
const PUBLIC_SEARCHABLE_STATUSES: CaseStatus[] = [
  "REVIEWING", "NEEDS_MORE_INFO", "VERIFIED", "DISPUTED", "ON_HOLD", "EXPLAINED",
];

export async function logSearch(source: "DISCORD" | "WEB") {
  await prisma.searchLog.create({ data: { source } });
}

export async function searchCases(query: string, opts: { publicOnly: boolean }) {
  const normalized = query.trim().toLowerCase();
  const digitsOnly = query.replace(/[^0-9]/g, "");

  const caseByNumber = await prisma.case.findFirst({
    where: {
      caseNumber: query.toUpperCase().replace(/^CASE#?/, "").trim(),
      ...(opts.publicOnly ? { status: { in: PUBLIC_SEARCHABLE_STATUSES } } : {}),
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
        opts.publicOnly ? { case: { status: { in: PUBLIC_SEARCHABLE_STATUSES } } } : {},
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

  return [...byCaseId.values()].map(({ case: c, matched }) => ({
    caseNumber: c.caseNumber,
    status: c.status,
    damageType: c.damageType,
    damageAmount: c.damageAmount,
    platform: c.platform,
    createdAt: c.createdAt,
    _count: c._count,
    matchedIdentifiers: matched,
  }));
}

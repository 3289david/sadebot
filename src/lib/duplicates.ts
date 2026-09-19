import { prisma } from "@/lib/prisma";
import type { IdentifierType } from "@prisma/client";

export interface DuplicateMatch {
  caseId: string;
  caseNumber: string;
  status: string;
  matchType: IdentifierType;
  matchValue: string;
}

// 새 제보의 식별자가 기존 사건과 겹치는지 조회한다.
// 단순 일치 = 동일인 확정이 아니므로, 호출부는 항상 "연결 후보"로만 다루고
// 운영진 검토를 거치도록 한다 (스펙 4번 항목).
export async function findDuplicateMatches(
  excludeCaseId: string,
  identifiers: { type: IdentifierType; normalized: string }[],
): Promise<DuplicateMatch[]> {
  if (identifiers.length === 0) return [];

  const matches: DuplicateMatch[] = [];
  for (const ident of identifiers) {
    const hits = await prisma.caseIdentifier.findMany({
      where: {
        type: ident.type,
        normalized: ident.normalized,
        caseId: { not: excludeCaseId },
      },
      include: { case: { select: { id: true, caseNumber: true, status: true } } },
    });
    for (const hit of hits) {
      matches.push({
        caseId: hit.case.id,
        caseNumber: hit.case.caseNumber,
        status: hit.case.status,
        matchType: ident.type,
        matchValue: ident.normalized,
      });
    }
  }

  // 사건별로 중복 제거
  const dedup = new Map<string, DuplicateMatch>();
  for (const m of matches) {
    const key = `${m.caseId}:${m.matchType}:${m.matchValue}`;
    dedup.set(key, m);
  }
  return [...dedup.values()];
}

export async function recordDuplicateLinks(caseId: string, matches: DuplicateMatch[]) {
  for (const m of matches) {
    await prisma.duplicateLink.upsert({
      where: {
        caseAId_caseBId_matchType_matchValue: {
          caseAId: caseId,
          caseBId: m.caseId,
          matchType: m.matchType,
          matchValue: m.matchValue,
        },
      },
      create: {
        caseAId: caseId,
        caseBId: m.caseId,
        matchType: m.matchType,
        matchValue: m.matchValue,
      },
      update: {},
    });
  }
}

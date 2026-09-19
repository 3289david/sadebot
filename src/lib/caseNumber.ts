import { prisma } from "@/lib/prisma";

// CASE #A10291 형태 — 매번 DB에서 카운트를 세지 않도록 마지막 사건번호를 파싱해 이어간다.
const PREFIX = "A";
const START = 10000;

export async function generateCaseNumber(): Promise<string> {
  const last = await prisma.case.findFirst({
    orderBy: { createdAt: "desc" },
    select: { caseNumber: true },
  });
  const lastNum = last ? Number(last.caseNumber.replace(PREFIX, "")) : START;
  const next = Number.isFinite(lastNum) && lastNum >= START ? lastNum + 1 : START + 1;
  const candidate = `${PREFIX}${next}`;

  // 동시 생성 경합 대비 — 존재하면 다음 번호로 재시도
  const exists = await prisma.case.findUnique({ where: { caseNumber: candidate } });
  if (exists) {
    return generateCaseNumber();
  }
  return candidate;
}

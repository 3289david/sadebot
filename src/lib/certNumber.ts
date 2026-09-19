import { prisma } from "@/lib/prisma";

const PREFIX = "SV-";
const START = 10000;

export async function generateCertNumber(): Promise<string> {
  const last = await prisma.serverCertification.findFirst({
    orderBy: { createdAt: "desc" },
    select: { certNumber: true },
  });
  const lastNum = last ? Number(last.certNumber.replace(PREFIX, "")) : START;
  const next = Number.isFinite(lastNum) && lastNum >= START ? lastNum + 1 : START + 1;
  const candidate = `${PREFIX}${next}`;

  const exists = await prisma.serverCertification.findUnique({ where: { certNumber: candidate } });
  if (exists) return generateCertNumber();
  return candidate;
}

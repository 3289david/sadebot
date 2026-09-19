import { prisma } from "@/lib/prisma";

export async function getStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, reviewing, verified, disputed, deleted, monthlyReports, monthlySearches, byDamageTypeRaw] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({ where: { status: "REVIEWING" } }),
    prisma.case.count({ where: { status: "VERIFIED" } }),
    prisma.case.count({ where: { status: "DISPUTED" } }),
    prisma.case.count({ where: { status: "DELETED" } }),
    prisma.case.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.searchLog.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.case.groupBy({ by: ["damageType"], _count: { damageType: true }, orderBy: { _count: { damageType: "desc" } }, take: 10 }),
  ]);

  return {
    total,
    reviewing,
    verified,
    disputed,
    deleted,
    monthlyReports,
    monthlySearches,
    byDamageType: byDamageTypeRaw.map((r) => ({ type: r.damageType, count: r._count.damageType })),
  };
}

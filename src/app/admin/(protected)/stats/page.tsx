import { getStats } from "@/bot/services/statsService";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">📊 통계</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card label="전체 사건" value={stats.total} />
        <Card label="검토중" value={stats.reviewing} />
        <Card label="검증완료" value={stats.verified} />
        <Card label="이의제기" value={stats.disputed} />
        <Card label="삭제됨" value={stats.deleted} />
        <Card label="이번 달 제보" value={stats.monthlyReports} />
        <Card label="이번 달 검색" value={stats.monthlySearches} />
      </div>

      <h2 className="text-sm font-semibold text-neutral-500 mb-2">🏆 피해 유형 통계</h2>
      <div className="bg-white rounded-xl border border-neutral-200 divide-y">
        {stats.byDamageType.map((d) => (
          <div key={d.type} className="flex justify-between px-4 py-2 text-sm">
            <span>{d.type}</span>
            <span className="font-medium">{d.count}</span>
          </div>
        ))}
        {stats.byDamageType.length === 0 && <p className="px-4 py-6 text-sm text-neutral-400">데이터가 없습니다.</p>}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <p className="text-sm text-neutral-500 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

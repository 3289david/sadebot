import Link from "next/link";
import { searchCases, logSearch } from "@/bot/services/caseService";
import { maskByType } from "@/lib/mask";
import { STATUS_LABEL, IDENTIFIER_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchCases(query, { publicOnly: true }) : [];
  if (query) await logSearch("WEB");

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-zinc-400 hover:underline">
        ← 홈으로
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">🔎 사기 DB 검색</h1>

      <form className="flex gap-2 mb-8" action="/search">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="전화번호 / 계좌번호 / Discord ID / 닉네임 / 이메일 등"
          className="flex-1 border border-zinc-300 rounded-lg px-4 py-3 text-sm"
        />
        <button className="px-5 py-3 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">검색</button>
      </form>

      {query && results.length === 0 && (
        <p className="text-zinc-500 text-sm">
          &ldquo;{query}&rdquo; 에 대한 검색 결과가 없습니다.
          <br />
          <span className="text-xs text-zinc-400">※ 결과 없음이 무혐의를 의미하지는 않습니다.</span>
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">⚠️ 관련 제보 {results.length}건</p>
          {results.map((r) => (
            <Link
              key={r.caseNumber}
              href={`/case/${r.caseNumber}`}
              className="block border border-zinc-200 rounded-xl p-4 hover:border-indigo-400 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">CASE #{r.caseNumber}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-100">{STATUS_LABEL[r.status] ?? r.status}</span>
              </div>
              <p className="text-sm text-zinc-600 mb-1">유형: {r.damageType}</p>
              {r.platform && <p className="text-sm text-zinc-600 mb-1">관련 플랫폼: {r.platform}</p>}
              <div className="text-sm text-zinc-500 space-y-0.5 mt-2">
                {r.matchedIdentifiers.map((m, idx) => (
                  <div key={idx}>
                    • {IDENTIFIER_LABEL[m.type] ?? m.type}: {maskByType(m.type as never, m.value)}
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                제보 {r._count?.reports ?? 0}건 · 증거 {r._count?.evidence ?? 0}개
              </p>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-400 mt-10">
        ※ DB 정보만으로 범죄 사실이 확정되는 것은 아닙니다. 전체 식별정보는 마스킹되어 있으며, 등록된 당사자는 이의제기를
        제출할 수 있습니다.
      </p>
    </main>
  );
}

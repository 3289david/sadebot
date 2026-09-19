import Link from "next/link";
import { searchCases, logSearch } from "@/bot/services/caseService";
import { maskByType } from "@/lib/mask";
import { STATUS_LABEL, IDENTIFIER_LABEL } from "@/lib/constants";
import { CERT_STATUS_LABEL } from "@/lib/certService";
import { computeVerdict, type VerdictLevel } from "@/lib/verdict";
import { buildJoongnaFraudUrl } from "@/lib/joongna";

export const dynamic = "force-dynamic";

const VERDICT_STYLE: Record<VerdictLevel, string> = {
  danger: "bg-red-600 text-white border-red-700",
  caution: "bg-orange-500 text-white border-orange-600",
  reviewing: "bg-amber-100 text-amber-900 border-amber-300",
  none: "bg-emerald-600 text-white border-emerald-700",
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchCases(query, { publicOnly: true }) : [];
  if (query) await logSearch("WEB");
  const verdict = query ? computeVerdict(results) : null;

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-zinc-400 hover:underline">
        ← 홈으로
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">🔎 사기 DB 검색</h1>
      <p className="text-sm text-zinc-500 mb-6">거래하기 전에 상대방의 전화번호, 계좌, 닉네임, Discord ID를 먼저 검색하세요.</p>

      <form className="flex gap-2 mb-6" action="/search">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="전화번호 / 계좌번호 / Discord ID / 닉네임 / 이메일 등"
          className="flex-1 border border-zinc-300 rounded-lg px-4 py-3 text-sm"
        />
        <button className="px-5 py-3 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">검색</button>
      </form>

      {/* 더치트(TheCheat) 스타일 — 사건 목록보다 먼저, "이 대상은 사기인가?"부터 한눈에 보여준다.
          아래 외부 링크는 검색어 형태(이메일/전화번호/계좌번호/그 외)에 맞춰 중고나라 사기조회로 연결된다. */}
      {verdict && (
        <div className={`rounded-xl border-2 p-5 mb-6 ${VERDICT_STYLE[verdict.level]}`}>
          <p className="text-lg font-bold mb-1">{verdict.title}</p>
          <p className="text-sm opacity-90 mb-3">{verdict.detail}</p>
          <a
            href={buildJoongnaFraudUrl(query)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs underline opacity-90 hover:opacity-100"
          >
            🔗 외부에서도 확인하기 (외부 사이트) →
          </a>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-500">관련 사건 상세</h2>
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
              {r.serverCert && (
                <Link href={`/server/${r.serverCert.certNumber}`} className="inline-block text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 mb-1">
                  🛡️ 안전서버 인증 ({r.serverCert.certNumber}) — {CERT_STATUS_LABEL[r.serverCert.status as keyof typeof CERT_STATUS_LABEL]}
                </Link>
              )}
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

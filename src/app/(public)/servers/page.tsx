import Link from "next/link";
import { searchCertifications, CERT_STATUS_LABEL } from "@/lib/certService";

export const dynamic = "force-dynamic";

export default async function ServersSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchCertifications(query) : [];

  return (
    <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-zinc-400 hover:underline">
        ← 홈으로
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-2">🛡️ 인증서버 검색</h1>
      <p className="text-sm text-zinc-500 mb-6">
        서버 이름 또는 인증번호로 안전서버 인증 여부를 확인하세요.{" "}
        <Link href="/certify" className="text-indigo-600 underline">
          내 서버 인증 신청하기 →
        </Link>
      </p>

      <form className="flex gap-2 mb-8" action="/servers">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="서버 이름 또는 인증번호 (SV-XXXXX)"
          className="flex-1 border border-zinc-300 rounded-lg px-4 py-3 text-sm"
        />
        <button className="px-5 py-3 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">검색</button>
      </form>

      {query && results.length === 0 && <p className="text-zinc-500 text-sm">&ldquo;{query}&rdquo; 에 대한 검색 결과가 없습니다.</p>}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((c) => (
            <Link
              key={c.id}
              href={`/server/${c.certNumber}`}
              className="flex items-center justify-between border border-zinc-200 rounded-xl p-4 hover:border-emerald-400 transition-colors"
            >
              <div>
                <p className="font-medium">{c.guildName ?? c.guildId}</p>
                <p className="text-xs text-zinc-400">{c.certNumber}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 shrink-0">{CERT_STATUS_LABEL[c.status]}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

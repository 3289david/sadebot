import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center gap-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">🛡️ 사데봇</h1>
        <p className="text-zinc-500 max-w-md mx-auto">
          사기 제보를 접수하고, 운영진 검토를 거쳐 검색 가능한 형태로 제공하는 커뮤니티 안전 플랫폼입니다.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/search" className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">
          🔎 사기 DB 검색
        </Link>
        <Link href="/report" className="px-6 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700">
          🚨 사기 제보하기
        </Link>
      </div>
      <p className="text-xs text-zinc-400 max-w-lg">
        ※ 공개된 정보는 개인정보 보호를 위해 마스킹되어 제공되며, DB 등재만으로 범죄 사실이 확정되지 않습니다.
        등록된 당사자는 이의제기를 통해 소명할 수 있습니다.
      </p>
      <Link href="/admin/login" className="text-xs text-zinc-400 underline">
        관리자 로그인
      </Link>
    </main>
  );
}

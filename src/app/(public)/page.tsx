import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24 text-center gap-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">🛡️ 사데봇</h1>
        <p className="text-zinc-500 max-w-md mx-auto text-sm sm:text-base">
          사기 제보를 접수하고, 운영진 검토를 거쳐 검색 가능한 형태로 제공하는 커뮤니티 안전 플랫폼입니다.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none sm:w-auto">
        <Link href="/search" className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 text-center">
          🔎 사기 DB 검색
        </Link>
        <Link href="/report" className="px-6 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 text-center">
          🚨 사기 제보하기
        </Link>
      </div>

      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-1">🛡️ 안전서버 인증</h2>
        <p className="text-xs sm:text-sm text-zinc-500 mb-4">
          운영팀이 직접 확인하고 인증한 안전거래 서버를 찾아보거나, 내 서버를 인증받아보세요.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/servers"
            className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 text-center"
          >
            🔍 인증서버 검색
          </Link>
          <Link
            href="/certify"
            className="flex-1 px-4 py-2.5 rounded-lg border border-emerald-600 text-emerald-700 text-sm font-medium hover:bg-emerald-50 text-center"
          >
            📝 내 서버 인증 신청
          </Link>
        </div>
      </div>

      <p className="text-xs text-zinc-400 max-w-lg px-2">
        ※ 공개된 정보는 개인정보 보호를 위해 마스킹되어 제공되며, DB 등재만으로 범죄 사실이 확정되지 않습니다.
        등록된 당사자는 이의제기를 통해 소명할 수 있습니다.
      </p>
      <Link href="/admin/login" className="text-xs text-zinc-400 underline">
        관리자 로그인
      </Link>
    </main>
  );
}

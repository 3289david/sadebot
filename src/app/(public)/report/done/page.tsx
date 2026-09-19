import Link from "next/link";

export default async function ReportDonePage({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: caseNumber } = await searchParams;

  return (
    <main className="flex-1 max-w-lg w-full mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold mb-4">✅ 제보가 접수되었습니다</h1>
      {caseNumber && <p className="text-lg font-mono mb-2">CASE #{caseNumber}</p>}
      <p className="text-sm text-zinc-500 mb-8">현재 상태: 🟡 검토 중 — 운영진 검토 후 결과가 안내됩니다.</p>
      <Link href="/" className="text-indigo-600 underline text-sm">
        홈으로 돌아가기
      </Link>
    </main>
  );
}

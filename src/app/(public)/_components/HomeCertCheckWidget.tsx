"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { checkCertification } from "@/lib/actions/certCheck";
import { CERT_STATUS_LABEL } from "@/lib/certService";

type Result = Awaited<ReturnType<typeof checkCertification>>;

export default function HomeCertCheckWidget() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | "not_found" | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    if (!input.trim()) return;
    startTransition(async () => {
      const r = await checkCertification(input);
      setResult(r ?? "not_found");
    });
  };

  return (
    <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl p-5 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold mb-1">🔐 위조 확인</h2>
      <p className="text-xs sm:text-sm text-zinc-500 mb-4">
        어딘가에서 안전서버 인증 배지를 봤다면, 서버 ID 또는 인증번호를 입력해 진짜인지 바로 확인하세요.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setResult(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="서버 ID 또는 인증번호 (SV-XXXXX)"
          className="flex-1 border border-zinc-300 rounded-lg px-3 py-2.5 text-sm font-mono"
        />
        <button
          onClick={run}
          disabled={pending}
          className="px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 shrink-0"
        >
          {pending ? "확인 중..." : "확인"}
        </button>
      </div>

      {result === "not_found" && (
        <p className="text-sm text-red-600 mt-3">🔴 인증 정보를 찾을 수 없습니다. 인증되지 않은 서버일 수 있습니다.</p>
      )}
      {result && result !== "not_found" && (
        <div className="mt-3 text-sm">
          <p className={result.status === "ACTIVE" ? "text-green-600" : "text-amber-600"}>
            {result.status === "ACTIVE" ? "🟢" : "🟡"} {result.guildName ?? result.guildId} — {CERT_STATUS_LABEL[result.status as keyof typeof CERT_STATUS_LABEL]}
          </p>
          <Link href={`/server/${result.certNumber}`} className="text-indigo-600 underline text-xs">
            {result.certNumber} 인증 페이지 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}

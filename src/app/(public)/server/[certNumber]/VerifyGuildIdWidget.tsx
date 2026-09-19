"use client";

import { useState } from "react";

export default function VerifyGuildIdWidget({ actualGuildId }: { actualGuildId: string }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"match" | "mismatch" | null>(null);

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-2">🔐 위조 확인</h3>
      <p className="text-xs text-zinc-500 mb-3">
        이 배지를 다른 서버에서 발견했다면, 확인하려는 디스코드 서버의 ID를 입력해 실제 인증 대상 서버가 맞는지 확인하세요.
      </p>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setResult(null);
          }}
          placeholder="확인하려는 서버 ID"
          className="flex-1 border border-zinc-300 rounded-md px-3 py-2 text-sm font-mono"
        />
        <button
          onClick={() => setResult(input.trim() === actualGuildId ? "match" : "mismatch")}
          className="px-4 py-2 rounded-md bg-zinc-900 text-white text-sm"
        >
          확인
        </button>
      </div>
      {result === "match" && <p className="text-sm text-green-600 mt-3">🟢 인증 일치 — 이 서버가 해당 인증을 받은 서버입니다.</p>}
      {result === "mismatch" && <p className="text-sm text-red-600 mt-3">🔴 인증 불일치 — 이 서버는 해당 인증을 받은 서버가 아닙니다.</p>}
    </div>
  );
}

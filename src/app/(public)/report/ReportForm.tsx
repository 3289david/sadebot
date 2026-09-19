"use client";

import { useState } from "react";
import { useActionState } from "react";
import { submitPublicReport } from "@/lib/actions/publicReport";
import { DAMAGE_TYPES } from "@/lib/constants";

const initialState = { error: undefined as string | undefined };

interface ReportGuild {
  id: string;
  name: string;
}

export default function ReportForm({ username, guilds }: { username: string; guilds: ReportGuild[] }) {
  const [state, formAction, pending] = useActionState(submitPublicReport, initialState);
  const [serverId, setServerId] = useState("");

  return (
    <>
      <p className="text-sm text-zinc-500 mb-6">
        <strong>{username}</strong> 님으로 로그인되었습니다. 디스코드 서버 안에서는 <code>/신고</code> 명령어로도
        제보할 수 있습니다. 증거 파일 첨부는 디스코드 제보를 이용해주세요.
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">피해 유형 *</label>
          <select name="damageType" required className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm">
            {DAMAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">피해 금액 (원)</label>
          <input name="damageAmount" type="number" min={0} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">사건 설명 *</label>
          <textarea name="description" required rows={5} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">상대방 정보 (선택, 한 줄에 하나씩)</label>
          <textarea
            name="identifiersText"
            rows={5}
            placeholder={"디스코드ID: 123456789012345678\n전화번호: 010-1234-5678\n계좌번호: 국민은행 12345678901234\n이름: 홍길동"}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-zinc-400 mt-1">
            &ldquo;항목: 값&rdquo; 형식으로 한 줄에 하나씩 적어주시면 정확하게 인식됩니다.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">관련 플랫폼 (선택)</label>
          <input name="platform" placeholder="예: Discord, OO거래사이트" className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="border border-zinc-200 rounded-lg p-3 space-y-2">
          <label className="block text-sm font-medium">신고 대상 디스코드 서버 (선택 — 디스코드 서버/DM 사기인 경우)</label>
          {guilds.length > 0 ? (
            <select
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
              defaultValue=""
              onChange={(e) => setServerId(e.target.value)}
            >
              <option value="">내가 속한 서버에서 선택...</option>
              {guilds.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          ) : (
            <a
              href="/api/auth/discord-user?returnTo=/report&scope=guilds"
              className="text-xs text-indigo-600 underline"
            >
              내가 속한 서버 목록 불러오기 (Discord 추가 권한 필요) →
            </a>
          )}
          <input
            name="serverId"
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
            placeholder="서버 ID (목록에서 선택하거나 직접 입력)"
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            name="serverInvite"
            placeholder="서버 초대 링크 (예: discord.gg/xxxxxxx)"
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "제출 중..." : "제보하기"}
        </button>
      </form>

      <p className="text-xs text-zinc-400 mt-6">
        ※ 제보 내용은 운영진 검토를 거친 후에만 검색 결과에 노출됩니다. 허위 제보는 이의제기 및 검토를 통해
        반려/삭제될 수 있습니다.
      </p>
    </>
  );
}

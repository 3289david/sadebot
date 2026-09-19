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
  const [identifiersText, setIdentifiersText] = useState("");

  const addGuildLine = (guildId: string, guildName: string) => {
    const line = `디스코드 서버: ${guildName} (${guildId})`;
    setIdentifiersText((t) => (t ? `${t}\n${line}` : line));
  };

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
            value={identifiersText}
            onChange={(e) => setIdentifiersText(e.target.value)}
            placeholder={"디스코드ID: 123456789012345678\n전화번호: 010-1234-5678\n계좌번호: 국민은행 12345678901234\n이름: 홍길동"}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-zinc-400 mt-1">
            자동으로 항목을 판단하지 않습니다. 입력하신 내용 그대로 저장되며, 운영진이 검토하면서 어떤 정보인지 직접
            확인해 등록합니다.
          </p>
          {guilds.length > 0 ? (
            <select
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                const guild = guilds.find((g) => g.id === e.target.value);
                if (guild) addGuildLine(guild.id, guild.name);
                e.target.value = "";
              }}
              className="mt-2 w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">내가 속한 서버를 신고 대상으로 추가...</option>
              {guilds.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          ) : (
            <a href="/api/auth/discord-user?returnTo=/report&scope=guilds" className="mt-2 inline-block text-xs text-indigo-600 underline">
              내가 속한 서버 목록 불러와서 추가하기 (Discord 추가 권한 필요) →
            </a>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">관련 플랫폼 (선택)</label>
          <input name="platform" placeholder="예: Discord, OO거래사이트" className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
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

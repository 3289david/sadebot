"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { submitPublicReport } from "@/lib/actions/publicReport";
import { DAMAGE_TYPES, IDENTIFIER_LABEL } from "@/lib/constants";

const initialState = { error: undefined as string | undefined };

// 사건 번호 참조용(CASE_REF)은 "상대방 정보"가 아니므로 제외.
const REPORTABLE_TYPES = Object.keys(IDENTIFIER_LABEL).filter((t) => t !== "CASE_REF");

interface ReportGuild {
  id: string;
  name: string;
}

interface IdentifierRow {
  key: number;
  type: string;
  value: string;
}

export default function ReportForm({ username, guilds }: { username: string; guilds: ReportGuild[] }) {
  const [state, formAction, pending] = useActionState(submitPublicReport, initialState);
  const rowKeySeq = useRef(0);
  const makeRow = (type = REPORTABLE_TYPES[0], value = ""): IdentifierRow => ({ key: rowKeySeq.current++, type, value });
  const [rows, setRows] = useState<IdentifierRow[]>(() => Array.from({ length: 5 }, () => makeRow()));

  const updateRow = (key: number, patch: Partial<IdentifierRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, makeRow()]);
  const removeRow = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));

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
          <label className="block text-sm font-medium mb-1">
            상대방 정보 (선택 — 항목을 고르고 값을 입력하세요. 자동 인식 없이 입력한 그대로 저장됩니다)
          </label>
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.key} className="flex gap-2">
                <select
                  name="identifierType"
                  value={row.type}
                  onChange={(e) => updateRow(row.key, { type: e.target.value })}
                  className="w-36 shrink-0 border border-zinc-300 rounded-lg px-2 py-2 text-sm"
                >
                  {REPORTABLE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {IDENTIFIER_LABEL[t]}
                    </option>
                  ))}
                </select>
                <input
                  name="identifierValue"
                  value={row.value}
                  onChange={(e) => updateRow(row.key, { value: e.target.value })}
                  placeholder="값 입력"
                  className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm"
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="px-2 text-zinc-400 hover:text-red-600"
                    aria-label="이 항목 삭제"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow} className="mt-2 text-xs text-indigo-600 underline">
            + 항목 추가
          </button>

          {guilds.length > 0 ? (
            <select
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                setRows((rs) => [...rs, makeRow("DISCORD_SERVER", e.target.value)]);
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

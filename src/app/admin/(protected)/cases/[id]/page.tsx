import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/adminAuth";
import { hasPermission } from "@/lib/rbac";
import { STATUS_LABEL, IDENTIFIER_LABEL, EVIDENCE_LABEL, DISPUTE_REASON_LABEL } from "@/lib/constants";
import { LABEL_MAP, normalizeLabel } from "@/lib/extract";
import {
  approveCaseAction,
  holdCaseAction,
  rejectCaseAction,
  needInfoCaseAction,
  deleteCaseAction,
  hideCaseAction,
  editCaseFieldAction,
  resolveDisputeAction,
  resolveDuplicateAction,
  classifyIdentifierLineAction,
} from "@/lib/actions/adminCase";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export default async function AdminCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      identifiers: true,
      evidence: { where: { deletedAt: null } },
      reports: true,
      disputes: { orderBy: { createdAt: "desc" } },
      timeline: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!c) notFound();

  await logAudit({ actorId: admin.id, action: "CASE_VIEW", targetType: "Case", targetId: c.id });

  const duplicateLinksRaw = await prisma.duplicateLink.findMany({ where: { caseAId: c.id } });
  const duplicateLinks = await Promise.all(
    duplicateLinksRaw.map(async (d) => ({ ...d, existing: await prisma.case.findUnique({ where: { id: d.caseBId } }) })),
  );

  const canReview = hasPermission(admin.role, "APPROVE_REJECT");
  const canEdit = hasPermission(admin.role, "EDIT_CASE");
  const canDelete = hasPermission(admin.role, "DELETE_CASE");
  const canHide = hasPermission(admin.role, "HIDE_CASE");
  const canDispute = hasPermission(admin.role, "RESOLVE_DISPUTE");

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">CASE #{c.caseNumber}</h1>
        <span className="text-sm px-3 py-1 rounded-full bg-neutral-200">{STATUS_LABEL[c.status] ?? c.status}</span>
      </div>

      {canReview && c.status !== "DELETED" && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-wrap gap-2">
          <form action={approveCaseAction.bind(null, c.id)}>
            <button className="px-3 py-2 rounded-md bg-green-600 text-white text-sm">✅ 승인</button>
          </form>
          <form action={holdCaseAction.bind(null, c.id)}>
            <button className="px-3 py-2 rounded-md bg-neutral-200 text-sm">⏸ 보류</button>
          </form>
          <details className="inline-block">
            <summary className="px-3 py-2 rounded-md bg-amber-500 text-white text-sm cursor-pointer list-none inline-block">🟠 추가자료 요청</summary>
            <form action={needInfoCaseAction.bind(null, c.id)} className="mt-2 flex gap-2">
              <input name="message" placeholder="제보자에게 전달할 메시지" required className="border border-neutral-300 rounded-md px-2 py-1 text-sm w-72" />
              <button className="px-3 py-1 rounded-md bg-amber-500 text-white text-sm">전송</button>
            </form>
          </details>
          <details className="inline-block">
            <summary className="px-3 py-2 rounded-md bg-red-600 text-white text-sm cursor-pointer list-none inline-block">❌ 반려</summary>
            <form action={rejectCaseAction.bind(null, c.id)} className="mt-2 flex gap-2">
              <input name="reason" placeholder="반려 사유" required className="border border-neutral-300 rounded-md px-2 py-1 text-sm w-72" />
              <button className="px-3 py-1 rounded-md bg-red-600 text-white text-sm">반려 확정</button>
            </form>
          </details>
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <Field label="유형" value={c.damageType} />
        <Field label="피해금액" value={c.damageAmount ? `₩${c.damageAmount.toLocaleString()}` : "미상"} />
        <Field label="관련 플랫폼" value={c.platform ?? "미상"} />
        <Field label="발생일" value={c.occurredAt ? c.occurredAt.toISOString().slice(0, 10) : "미상"} />
        <Field label="공개 여부" value={c.isPublic ? "공개" : "비공개"} />
        <Field label="접수일" value={c.createdAt.toISOString().slice(0, 16).replace("T", " ")} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-500 mb-2">사건 설명</h2>
        <p className="text-sm whitespace-pre-line">{c.description}</p>
        {canEdit && (
          <details className="mt-3">
            <summary className="text-xs text-indigo-600 cursor-pointer">필드 수정</summary>
            <form action={editCaseFieldAction.bind(null, c.id)} className="mt-2 space-y-2">
              <select name="field" className="border border-neutral-300 rounded-md px-2 py-1 text-sm">
                <option value="description">사건 설명</option>
                <option value="damageType">피해 유형</option>
                <option value="damageAmount">피해 금액</option>
                <option value="platform">관련 플랫폼</option>
              </select>
              <input name="value" placeholder="새 값" required className="border border-neutral-300 rounded-md px-2 py-1 text-sm w-full" />
              <input name="reason" placeholder="수정 사유" required className="border border-neutral-300 rounded-md px-2 py-1 text-sm w-full" />
              <button className="px-3 py-1 rounded-md bg-neutral-800 text-white text-sm">수정 저장</button>
            </form>
          </details>
        )}
      </div>

      {canEdit && <RawIdentifierLines caseId={c.id} reports={c.reports} />}

      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-500 mb-2">연관 식별자 (원본 - 관리자 전용)</h2>
        <div className="space-y-1 text-sm">
          {c.identifiers.length === 0 && <p className="text-neutral-400">없음</p>}
          {c.identifiers.map((i) => (
            <div key={i.id} className="flex gap-2">
              <span className="text-neutral-400 w-32 shrink-0">{IDENTIFIER_LABEL[i.type] ?? i.type}</span>
              <span className="font-mono">{i.value}</span>
              <span className="text-xs text-neutral-400">{i.source === "AUTO_EXTRACT" ? "(자동추출)" : "(수동입력)"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-500 mb-2">증거 ({c.evidence.length}개)</h2>
        <div className="space-y-1 text-sm">
          {c.evidence.length === 0 && <p className="text-neutral-400">없음</p>}
          {c.evidence.map((e) => (
            <div key={e.id} className="flex items-center gap-2">
              <span>{EVIDENCE_LABEL[e.type] ?? e.type}</span>
              <a href={`/api/admin/evidence/${e.id}`} className="text-indigo-600 underline text-xs">
                {e.fileName}
              </a>
              <span className="text-xs text-neutral-400">{e.uploadedAt.toISOString().slice(0, 16).replace("T", " ")}</span>
            </div>
          ))}
        </div>
      </div>

      {duplicateLinks.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <h2 className="text-sm font-semibold text-neutral-500 mb-2">🔗 관계 그래프 / 중복 후보</h2>
          <div className="space-y-2 text-sm">
            {duplicateLinks.map((d) => (
              <div key={d.id} className="flex items-center justify-between border border-neutral-100 rounded-md p-2">
                <span>
                  CASE #{d.existing?.caseNumber} — {IDENTIFIER_LABEL[d.matchType] ?? d.matchType} 일치 ({d.status})
                </span>
                {canReview && d.status === "PENDING" && (
                  <div className="flex gap-1">
                    <form action={resolveDuplicateAction.bind(null, c.id, d.caseBId, "link")}>
                      <button className="text-xs px-2 py-1 rounded bg-indigo-600 text-white">연결</button>
                    </form>
                    <form action={resolveDuplicateAction.bind(null, c.id, d.caseBId, "separate")}>
                      <button className="text-xs px-2 py-1 rounded bg-neutral-200">별도 유지</button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-500 mb-2">당사자 이의제기 ({c.disputes.length}건)</h2>
        <div className="space-y-3 text-sm">
          {c.disputes.length === 0 && <p className="text-neutral-400">없음</p>}
          {c.disputes.map((d) => (
            <div key={d.id} className="border border-neutral-100 rounded-md p-3">
              <p className="font-medium">{DISPUTE_REASON_LABEL[d.reason] ?? d.reason}</p>
              <p className="text-neutral-500 whitespace-pre-line">{d.reasonDetail}</p>
              <p className="text-xs text-neutral-400 mt-1">상태: {d.status}</p>
              {canDispute && d.status === "PENDING" && (
                <div className="flex gap-1 mt-2">
                  <form action={resolveDisputeAction.bind(null, d.id, "keep")}>
                    <button className="text-xs px-2 py-1 rounded bg-neutral-200">유지</button>
                  </form>
                  <form action={resolveDisputeAction.bind(null, d.id, "hide")}>
                    <button className="text-xs px-2 py-1 rounded bg-indigo-600 text-white">임시 비공개</button>
                  </form>
                  <details className="inline-block">
                    <summary className="text-xs px-2 py-1 rounded bg-amber-500 text-white cursor-pointer list-none inline-block">추가자료 요청</summary>
                    <form action={resolveDisputeAction.bind(null, d.id, "needinfo")} className="mt-1 flex gap-1">
                      <input name="message" placeholder="이의제기자에게 전달할 메시지" required className="border border-neutral-300 rounded px-2 py-1 text-xs w-56" />
                      <button className="px-2 py-1 rounded bg-amber-500 text-white text-xs">전송</button>
                    </form>
                  </details>
                  <form action={resolveDisputeAction.bind(null, d.id, "delete")}>
                    <button className="text-xs px-2 py-1 rounded bg-red-600 text-white">삭제</button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-500 mb-2">검토 기록 (타임라인)</h2>
        <div className="space-y-1 text-xs text-neutral-500">
          {c.timeline.map((t) => (
            <div key={t.id}>
              {t.createdAt.toISOString().slice(0, 16).replace("T", " ")} — {t.event} {t.actorId ? `(${t.actorId})` : ""}
            </div>
          ))}
        </div>
      </div>

      {(canHide || canDelete) && (
        <div className="bg-white rounded-xl border border-red-200 p-4 flex gap-2">
          {canHide && (
            <form action={hideCaseAction.bind(null, c.id)}>
              <button className="px-3 py-2 rounded-md bg-neutral-200 text-sm">임시 비공개 처리</button>
            </form>
          )}
          {canDelete && c.status !== "DELETED" && (
            <details>
              <summary className="px-3 py-2 rounded-md bg-red-700 text-white text-sm cursor-pointer list-none inline-block">🗑️ 삭제</summary>
              <form action={deleteCaseAction.bind(null, c.id)} className="mt-2 flex gap-2">
                <input name="reason" placeholder="삭제 사유" required className="border border-neutral-300 rounded-md px-2 py-1 text-sm w-72" />
                <button className="px-3 py-1 rounded-md bg-red-700 text-white text-sm">삭제 확정</button>
              </form>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-neutral-400 text-xs">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// 사건 번호 참조용(CASE_REF)은 "상대방 정보" 분류 대상이 아니므로 제외.
const REPORTABLE_TYPES = Object.keys(IDENTIFIER_LABEL).filter((t) => t !== "CASE_REF");

function RawIdentifierLines({
  caseId,
  reports,
}: {
  caseId: string;
  reports: { id: string; rawContent: string | null; createdAt: Date }[];
}) {
  // "항목: 값" 형식으로 적었다면 항목(라벨) 부분은 DB에 넣지 않는다 — 값만 저장한다.
  // 라벨이 우리가 아는 항목과 일치하면 드롭다운 기본값으로 미리 골라준다(관리자가 그대로 확인/수정 가능).
  const LINE_RE = /^\s*([가-힣a-zA-Z0-9\s()[\]]{1,20})[:：]\s*(.+?)\s*$/;
  const lines = reports.flatMap((r) =>
    (r.rawContent ?? "")
      .split(/\r?\n/)
      .map((raw) => raw.trim())
      .filter((raw) => raw)
      .map((raw, idx) => {
        const m = raw.match(LINE_RE);
        const value = m ? m[2].trim() : raw;
        const suggestedType = m ? LABEL_MAP[normalizeLabel(m[1])] : undefined;
        return { key: `${r.id}:${idx}`, raw, value, suggestedType };
      }),
  );

  if (lines.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-amber-300 p-4">
      <h2 className="text-sm font-semibold text-amber-700 mb-1">🔎 상대방 정보 (제보자 원문 — 분류 필요)</h2>
      <p className="text-xs text-neutral-400 mb-3">
        자동으로 판단하지 않은 원문입니다. 각 줄이 어떤 항목인지 골라서 DB에 등록하세요. (항목: 값 형식으로 적혀 있으면
        값만 저장되고, 항목 부분은 드롭다운 기본값으로만 사용됩니다)
      </p>
      <div className="space-y-2">
        {lines.map((l) => (
          <form key={l.key} action={classifyIdentifierLineAction.bind(null, caseId, l.value)} className="flex items-center gap-2 text-sm">
            <span className="flex-1 font-mono bg-neutral-50 border border-neutral-200 rounded px-2 py-1 truncate">{l.raw}</span>
            <select
              name="type"
              defaultValue={l.suggestedType && REPORTABLE_TYPES.includes(l.suggestedType) ? l.suggestedType : ""}
              required
              className="border border-neutral-300 rounded-md px-2 py-1 text-sm shrink-0"
            >
              <option value="" disabled>
                항목 선택...
              </option>
              {REPORTABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {IDENTIFIER_LABEL[t]}
                </option>
              ))}
            </select>
            <button className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm shrink-0">DB에 추가</button>
          </form>
        ))}
      </div>
    </div>
  );
}

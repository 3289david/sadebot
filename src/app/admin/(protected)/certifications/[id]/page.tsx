import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/adminAuth";
import { hasPermission } from "@/lib/rbac";
import { CERT_STATUS_LABEL } from "@/lib/certService";
import { recordTestResultAction, changeCertStatusAction } from "@/lib/actions/adminCert";
import RollTestPlanButton from "./RollTestPlanButton";
import type { CertStatus, CertTestType } from "@prisma/client";

export const dynamic = "force-dynamic";

const TEST_TYPE_LABEL: Record<CertTestType, string> = {
  BOT_INSTALLED: "인증 봇 설치 확인 (자동)",
  ORDER_PROCESSING: "주문 처리",
  PAYMENT_PROCESSING: "결제 처리",
  PRODUCT_DELIVERY: "상품/서비스 제공",
  TRADE_COMPLIANCE: "거래 약속 준수",
  INQUIRY_RESPONSE: "문의 응답",
  REFUND_POLICY: "환불 정책",
  POST_SALE_SUPPORT: "거래 후 대응",
  TERMS_POLICY: "약관/운영정책",
};

const NEXT_STATUS: Partial<Record<CertStatus, { status: CertStatus; label: string; color: string }[]>> = {
  PENDING: [{ status: "INFO_CHECK", label: "정보 확인 시작", color: "bg-neutral-800" }],
  INFO_CHECK: [{ status: "TESTING", label: "테스트 시작", color: "bg-indigo-600" }],
  TESTING: [{ status: "REVIEW", label: "검토 요청", color: "bg-amber-500" }],
  REVIEW: [
    { status: "ACTIVE", label: "✅ 인증 완료 처리", color: "bg-green-600" },
    { status: "REVOKED", label: "❌ 반려", color: "bg-red-600" },
  ],
  ACTIVE: [
    { status: "SUSPENDED", label: "⏸ 정지", color: "bg-neutral-500" },
    { status: "REVOKED", label: "🚨 취소", color: "bg-red-700" },
  ],
  SUSPENDED: [
    { status: "ACTIVE", label: "정지 해제", color: "bg-green-600" },
    { status: "REVOKED", label: "취소", color: "bg-red-700" },
  ],
};

export default async function AdminCertificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!hasPermission(admin.role, "MANAGE_CERTIFICATION")) redirect("/admin");

  const { id } = await params;
  const cert = await prisma.serverCertification.findUnique({
    where: { id },
    include: { testItems: true, events: { orderBy: { createdAt: "desc" }, take: 30 } },
  });
  if (!cert) notFound();

  const autoCheck = cert.autoCheckResult as Record<string, unknown> | null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🛡️ {cert.guildName ?? cert.guildId}</h1>
        <span className="text-sm px-3 py-1 rounded-full bg-neutral-200">{CERT_STATUS_LABEL[cert.status]}</span>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-neutral-400 text-xs">인증번호</dt>
          <dd>{cert.certNumber}</dd>
        </div>
        <div>
          <dt className="text-neutral-400 text-xs">서버 ID</dt>
          <dd className="font-mono">{cert.guildId}</dd>
        </div>
        <div>
          <dt className="text-neutral-400 text-xs">신청자</dt>
          <dd>{cert.applicantId}</dd>
        </div>
        <div>
          <dt className="text-neutral-400 text-xs">신청일</dt>
          <dd>{cert.appliedAt.toISOString().slice(0, 16).replace("T", " ")}</dd>
        </div>
        <div>
          <dt className="text-neutral-400 text-xs">인증일 / 최근 검증</dt>
          <dd>{cert.verifiedAt ? cert.verifiedAt.toISOString().slice(0, 10) : "-"}</dd>
        </div>
        <div>
          <dt className="text-neutral-400 text-xs">만료일</dt>
          <dd>{cert.expiresAt ? cert.expiresAt.toISOString().slice(0, 10) : "-"}</dd>
        </div>
      </div>

      {autoCheck && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <h2 className="text-sm font-semibold text-neutral-500 mb-2">🔍 서버 기본 정보 자동 확인</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>봇 설치: {autoCheck.botInstalled ? "✅" : "❌"}</div>
            <div>거래 관련 채널: {autoCheck.hasTradeChannel ? "✅" : "➖"}</div>
            <div>환불 정책 채널: {autoCheck.hasRefundChannel ? "✅" : "➖"}</div>
            <div>약관 채널: {autoCheck.hasTermsChannel ? "✅" : "➖"}</div>
            <div>문의 채널: {autoCheck.hasInquiryChannel ? "✅" : "➖"}</div>
            <div>서버 생성일: {autoCheck.guildCreatedAt ? String(autoCheck.guildCreatedAt).slice(0, 10) : "-"}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-500">🕵️ 비공개 안전거래 테스트 체크리스트</h2>
          <RollTestPlanButton certId={cert.id} />
        </div>
        <div className="space-y-3">
          {cert.testItems
            .filter((t) => t.testType !== "BOT_INSTALLED")
            .map((t) => (
              <form key={t.id} action={recordTestResultAction.bind(null, cert.id, t.testType)} className="flex items-center gap-2 border border-neutral-100 rounded-md p-2 text-sm">
                <span className="w-40 shrink-0">{TEST_TYPE_LABEL[t.testType]}</span>
                <select name="result" defaultValue={t.result} className="border border-neutral-300 rounded px-2 py-1 text-xs">
                  <option value="NA">➖ 미실시</option>
                  <option value="PASS">✅ 정상</option>
                  <option value="FAIL">❌ 문제 발견</option>
                </select>
                <input name="note" defaultValue={t.note ?? ""} placeholder="메모 (선택)" className="flex-1 border border-neutral-300 rounded px-2 py-1 text-xs" />
                <button className="px-2 py-1 rounded bg-neutral-800 text-white text-xs">저장</button>
              </form>
            ))}
        </div>
      </div>

      {NEXT_STATUS[cert.status] && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-wrap gap-2">
          {NEXT_STATUS[cert.status]!.map((n) => (
            <details key={n.status} className="inline-block">
              <summary className={`px-3 py-2 rounded-md text-white text-sm cursor-pointer list-none inline-block ${n.color}`}>{n.label}</summary>
              <form action={changeCertStatusAction.bind(null, cert.id, n.status)} className="mt-2 flex gap-2">
                <input name="reason" placeholder="사유 (선택)" className="border border-neutral-300 rounded-md px-2 py-1 text-sm w-64" />
                <button className={`px-3 py-1 rounded-md text-white text-sm ${n.color}`}>확정</button>
              </form>
            </details>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-500 mb-2">이력</h2>
        <div className="space-y-1 text-xs text-neutral-500">
          {cert.events.map((e) => (
            <div key={e.id}>
              {e.createdAt.toISOString().slice(0, 16).replace("T", " ")} — {e.event} {e.actorId ? `(${e.actorId})` : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

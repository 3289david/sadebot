import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CERT_STATUS_LABEL } from "@/lib/certService";
import VerifyGuildIdWidget from "./VerifyGuildIdWidget";
import type { CertTestType } from "@prisma/client";

export const dynamic = "force-dynamic";

const TEST_TYPE_LABEL: Record<CertTestType, string> = {
  BOT_INSTALLED: "인증 봇 설치",
  ORDER_PROCESSING: "주문 처리",
  PAYMENT_PROCESSING: "결제 처리",
  PRODUCT_DELIVERY: "상품/서비스 제공",
  TRADE_COMPLIANCE: "거래 약속 준수",
  INQUIRY_RESPONSE: "문의 응답",
  REFUND_POLICY: "환불 정책",
  POST_SALE_SUPPORT: "거래 후 대응",
  TERMS_POLICY: "약관/운영정책",
};

export default async function ServerCertPage({ params }: { params: Promise<{ certNumber: string }> }) {
  const { certNumber } = await params;
  const cert = await prisma.serverCertification.findUnique({
    where: { certNumber: certNumber.toUpperCase() },
    include: { testItems: true },
  });
  if (!cert) notFound();

  return (
    <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-zinc-400 hover:underline">
        ← 홈으로
      </Link>

      <div className="my-4 rounded-lg overflow-hidden border border-zinc-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/badge/${cert.certNumber}`} alt="안전서버 인증 배지" width={600} height={200} className="w-full h-auto block" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{cert.guildName ?? "알 수 없는 서버"}</h1>
        <span className="text-sm px-3 py-1 rounded-full bg-zinc-100">{CERT_STATUS_LABEL[cert.status]}</span>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <dt className="text-zinc-400">인증 번호</dt>
          <dd className="font-mono">{cert.certNumber}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">인증일</dt>
          <dd>{cert.verifiedAt ? cert.verifiedAt.toISOString().slice(0, 10) : "-"}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">최근 검증</dt>
          <dd>{cert.lastVerifiedAt ? cert.lastVerifiedAt.toISOString().slice(0, 10) : "-"}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">만료일</dt>
          <dd>{cert.expiresAt ? cert.expiresAt.toISOString().slice(0, 10) : "-"}</dd>
        </div>
      </dl>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-500 mb-2">인증 확인 항목</h2>
        <div className="space-y-1 text-sm">
          {cert.testItems.map((t) => (
            <div key={t.id} className="flex justify-between border-b border-zinc-100 py-1.5">
              <span>{TEST_TYPE_LABEL[t.testType]}</span>
              <span>{t.result === "PASS" ? "✅" : t.result === "FAIL" ? "❌" : "➖"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <VerifyGuildIdWidget actualGuildId={cert.guildId} />
      </div>

      <p className="text-xs text-zinc-400">
        ⚠️ 인증은 특정 서버가 모든 거래에서 문제가 없다는 것을 보장하는 의미가 아닙니다. 인증 이후 발생한 문제는{" "}
        <Link href="/report" className="underline">
          제보
        </Link>
        를 통해 알려주세요.
      </p>
    </main>
  );
}

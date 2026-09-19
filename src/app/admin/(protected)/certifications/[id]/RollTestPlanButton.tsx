"use client";

import { useState, useTransition } from "react";
import { rollTestPlanAction } from "@/lib/actions/adminCert";

const LABEL: Record<string, string> = {
  ORDER_PROCESSING: "주문 처리",
  PAYMENT_PROCESSING: "결제 처리",
  PRODUCT_DELIVERY: "상품/서비스 제공",
  TRADE_COMPLIANCE: "거래 약속 준수",
  INQUIRY_RESPONSE: "문의 응답",
  REFUND_POLICY: "환불 정책",
  POST_SALE_SUPPORT: "거래 후 대응",
  TERMS_POLICY: "약관/운영정책",
};

export default function RollTestPlanButton({ certId }: { certId: string }) {
  const [plan, setPlan] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        disabled={pending}
        onClick={() => startTransition(async () => setPlan(await rollTestPlanAction(certId)))}
        className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-50"
      >
        🎲 무작위 테스트 뽑기
      </button>
      {plan && (
        <p className="text-sm text-neutral-600 mt-2">
          이번 테스트 항목: <strong>{plan.map((p) => LABEL[p] ?? p).join(", ")}</strong>
        </p>
      )}
    </div>
  );
}

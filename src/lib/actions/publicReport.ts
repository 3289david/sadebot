"use server";

import { redirect } from "next/navigation";
import { createCase } from "@/bot/services/caseService";
import { extractIdentifiers, extractDamageAmount, guessDamageType } from "@/lib/extract";
import { checkReportRateLimit } from "@/lib/ratelimit";
import { postWebhookEmbed } from "@/lib/discordWebhook";
import { IDENTIFIER_LABEL } from "@/lib/constants";
import { headers } from "next/headers";
import type { IdentifierType } from "@prisma/client";

export async function submitPublicReport(_prev: unknown, formData: FormData) {
  const damageType = String(formData.get("damageType") ?? "기타");
  const description = String(formData.get("description") ?? "").trim();
  const identifiersText = String(formData.get("identifiersText") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim() || null;
  const amountRaw = String(formData.get("damageAmount") ?? "").trim();

  if (!description) return { error: "사건 설명을 입력해주세요." };

  // 웹 제보자는 디스코드 계정이 없을 수 있으므로 세션 없는 익명 식별자로 rate limit.
  const h = await headers();
  const pseudoId = `web:${h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;
  const rl = await checkReportRateLimit(pseudoId);
  if (!rl.allowed) return { error: "짧은 시간 동안 너무 많은 제보가 접수되었습니다. 잠시 후 다시 시도해주세요." };

  const fullText = `${description}\n${identifiersText}`;
  const extracted = extractIdentifiers(fullText);
  const damageAmount = amountRaw ? Number(amountRaw.replace(/[^0-9]/g, "")) || null : extractDamageAmount(fullText);
  const finalDamageType = guessDamageType(fullText) ?? damageType;

  const { case: created } = await createCase({
    damageType: finalDamageType,
    damageAmount,
    occurredAt: null,
    description,
    platform,
    rawContent: fullText,
    autoExtracted: extracted.length > 0,
    identifiers: extracted.map((e) => ({ type: e.type as IdentifierType, value: e.value, source: "AUTO_EXTRACT" as const })),
  });

  await postWebhookEmbed(
    "🚨 신규 사기 제보 (웹)",
    [
      { name: "Case", value: `#${created.caseNumber}`, inline: true },
      { name: "유형", value: finalDamageType, inline: true },
      { name: "피해금액", value: damageAmount ? `₩${damageAmount.toLocaleString()}` : "미상", inline: true },
      { name: "관련 플랫폼", value: platform ?? "미상", inline: true },
      {
        name: "자동 인식 정보",
        value: extracted.length ? [...new Set(extracted.map((e) => IDENTIFIER_LABEL[e.type] ?? e.type))].map((t) => `• ${t}`).join("\n") : "없음",
      },
      { name: "상태", value: "🟡 검토 필요 (웹 제보)" },
    ],
    0xed4245,
  );

  redirect(`/report/done?case=${created.caseNumber}`);
}

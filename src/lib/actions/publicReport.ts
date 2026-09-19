"use server";

import { redirect } from "next/navigation";
import { createCase } from "@/bot/services/caseService";
import { extractDamageAmount } from "@/lib/extract";
import { checkReportRateLimit } from "@/lib/ratelimit";
import { postWebhookEmbed } from "@/lib/discordWebhook";
import { getCurrentReporter } from "@/lib/userSession";
import { DAMAGE_TYPES, IDENTIFIER_LABEL } from "@/lib/constants";
import type { IdentifierType } from "@prisma/client";

export async function submitPublicReport(_prev: unknown, formData: FormData) {
  const reporter = await getCurrentReporter();
  if (!reporter) redirect("/api/auth/discord-user?returnTo=/report");

  const damageTypeRaw = String(formData.get("damageType") ?? "");
  const damageType = DAMAGE_TYPES.includes(damageTypeRaw) ? damageTypeRaw : "기타";
  const description = String(formData.get("description") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim() || null;
  const amountRaw = String(formData.get("damageAmount") ?? "").trim();

  // 피해자가 항목(유형)을 직접 고르고 값을 그대로 입력한 것만 저장한다 — 자동 인식/추측 없음.
  const identifierTypes = formData.getAll("identifierType").map(String);
  const identifierValues = formData.getAll("identifierValue").map(String);
  const seen = new Set<string>();
  const identifiers = identifierTypes
    .map((type, i) => ({ type, value: (identifierValues[i] ?? "").trim() }))
    .filter((e) => e.value && IDENTIFIER_LABEL[e.type])
    .filter((e) => {
      const key = `${e.type}:${e.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (!description) return { error: "사건 설명을 입력해주세요." };

  const rl = await checkReportRateLimit(reporter.discordId);
  if (!rl.allowed) return { error: "짧은 시간 동안 너무 많은 제보가 접수되었습니다. 잠시 후 다시 시도해주세요." };

  const damageAmount = amountRaw ? Number(amountRaw.replace(/[^0-9]/g, "")) || null : extractDamageAmount(description);
  const rawContent = [description, ...identifiers.map((e) => `${IDENTIFIER_LABEL[e.type]}: ${e.value}`)].join("\n");

  const { case: created } = await createCase({
    damageType,
    damageAmount,
    occurredAt: null,
    description,
    platform,
    reporterDiscordId: reporter.discordId,
    reporterUsername: reporter.username,
    rawContent,
    autoExtracted: false,
    identifiers: identifiers.map((e) => ({ type: e.type as IdentifierType, value: e.value, source: "MANUAL" as const })),
  });

  await postWebhookEmbed(
    "🚨 신규 사기 제보 (웹)",
    [
      { name: "Case", value: `#${created.caseNumber}`, inline: true },
      { name: "제보자", value: `${reporter.username} (${reporter.discordId})`, inline: true },
      { name: "유형", value: damageType, inline: true },
      { name: "피해금액", value: damageAmount ? `₩${damageAmount.toLocaleString()}` : "미상", inline: true },
      { name: "관련 플랫폼", value: platform ?? "미상", inline: true },
      {
        name: "제보자 입력 정보",
        value: identifiers.length ? identifiers.map((e) => `• ${IDENTIFIER_LABEL[e.type]}: ${e.value}`).join("\n") : "없음",
      },
      { name: "상태", value: "🟡 검토 필요 (웹 제보)" },
    ],
    0xed4245,
  );

  redirect(`/report/done?case=${created.caseNumber}`);
}

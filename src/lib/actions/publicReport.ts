"use server";

import { redirect } from "next/navigation";
import { createCase } from "@/bot/services/caseService";
import { extractDamageAmount } from "@/lib/extract";
import { checkReportRateLimit } from "@/lib/ratelimit";
import { postWebhookEmbed } from "@/lib/discordWebhook";
import { getCurrentReporter } from "@/lib/userSession";
import { DAMAGE_TYPES } from "@/lib/constants";

export async function submitPublicReport(_prev: unknown, formData: FormData) {
  const reporter = await getCurrentReporter();
  if (!reporter) redirect("/api/auth/discord-user?returnTo=/report");

  const damageTypeRaw = String(formData.get("damageType") ?? "");
  const damageType = DAMAGE_TYPES.includes(damageTypeRaw) ? damageTypeRaw : "기타";
  const description = String(formData.get("description") ?? "").trim();
  const identifiersText = String(formData.get("identifiersText") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim() || null;
  const amountRaw = String(formData.get("damageAmount") ?? "").trim();

  if (!description) return { error: "사건 설명을 입력해주세요." };

  const rl = await checkReportRateLimit(reporter.discordId);
  if (!rl.allowed) return { error: "짧은 시간 동안 너무 많은 제보가 접수되었습니다. 잠시 후 다시 시도해주세요." };

  const damageAmount = amountRaw ? Number(amountRaw.replace(/[^0-9]/g, "")) || null : extractDamageAmount(description);

  // 상대방 정보는 자동으로 항목을 판단하지 않는다 — 입력한 원문 그대로 저장해두고,
  // 관리자 패널에서 한 줄씩 확인해 어떤 항목인지 직접 판단해 DB(CaseIdentifier)에 등록한다.
  const { case: created } = await createCase({
    damageType,
    damageAmount,
    occurredAt: null,
    description,
    platform,
    reporterDiscordId: reporter.discordId,
    reporterUsername: reporter.username,
    rawContent: identifiersText,
    autoExtracted: false,
    identifiers: [],
  });

  await postWebhookEmbed(
    "🚨 신규 사기 제보 (웹)",
    [
      { name: "Case", value: `#${created.caseNumber}`, inline: true },
      { name: "제보자", value: `${reporter.username} (${reporter.discordId})`, inline: true },
      { name: "유형", value: damageType, inline: true },
      { name: "피해금액", value: damageAmount ? `₩${damageAmount.toLocaleString()}` : "미상", inline: true },
      { name: "관련 플랫폼", value: platform ?? "미상", inline: true },
      { name: "상대방 정보 (관리자 패널에서 분류 필요)", value: identifiersText ? identifiersText.slice(0, 1000) : "없음" },
      { name: "상태", value: "🟡 검토 필요 (웹 제보)" },
    ],
    0xed4245,
  );

  redirect(`/report/done?case=${created.caseNumber}`);
}

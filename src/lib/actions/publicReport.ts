"use server";

import { redirect } from "next/navigation";
import { createCase } from "@/bot/services/caseService";
import { extractAll, extractDamageAmount, guessDamageType } from "@/lib/extract";
import { checkReportRateLimit } from "@/lib/ratelimit";
import { postWebhookEmbed } from "@/lib/discordWebhook";
import { getCurrentReporter } from "@/lib/userSession";
import { IDENTIFIER_LABEL } from "@/lib/constants";
import type { IdentifierType } from "@prisma/client";

export async function submitPublicReport(_prev: unknown, formData: FormData) {
  const reporter = await getCurrentReporter();
  if (!reporter) redirect("/api/auth/discord-user?returnTo=/report");

  const damageType = String(formData.get("damageType") ?? "기타");
  const description = String(formData.get("description") ?? "").trim();
  const identifiersText = String(formData.get("identifiersText") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim() || null;
  const amountRaw = String(formData.get("damageAmount") ?? "").trim();
  const serverId = String(formData.get("serverId") ?? "").trim();
  const serverInvite = String(formData.get("serverInvite") ?? "").trim();

  if (!description) return { error: "사건 설명을 입력해주세요." };

  const rl = await checkReportRateLimit(reporter.discordId);
  if (!rl.allowed) return { error: "짧은 시간 동안 너무 많은 제보가 접수되었습니다. 잠시 후 다시 시도해주세요." };

  const serverLines = [serverId && `서버ID: ${serverId}`, serverInvite && `초대링크: ${serverInvite}`].filter(Boolean).join("\n");
  const fullText = `${description}\n${identifiersText}${serverLines ? `\n${serverLines}` : ""}`;
  const extracted = extractAll(fullText);
  const damageAmount = amountRaw ? Number(amountRaw.replace(/[^0-9]/g, "")) || null : extractDamageAmount(fullText);
  const finalDamageType = guessDamageType(fullText) ?? damageType;

  const { case: created } = await createCase({
    damageType: finalDamageType,
    damageAmount,
    occurredAt: null,
    description,
    platform,
    reporterDiscordId: reporter.discordId,
    reporterUsername: reporter.username,
    rawContent: fullText,
    autoExtracted: extracted.length > 0,
    identifiers: extracted.map((e) => ({ type: e.type as IdentifierType, value: e.value, source: "AUTO_EXTRACT" as const })),
  });

  await postWebhookEmbed(
    "🚨 신규 사기 제보 (웹)",
    [
      { name: "Case", value: `#${created.caseNumber}`, inline: true },
      { name: "제보자", value: `${reporter.username} (${reporter.discordId})`, inline: true },
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

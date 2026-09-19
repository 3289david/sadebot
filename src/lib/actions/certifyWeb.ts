"use server";

import { redirect } from "next/navigation";
import { getCurrentReporter } from "@/lib/userSession";
import { applyCertification } from "@/lib/certService";
import { botConfig } from "@/bot/config";

export async function applyCertificationWebAction(guildId: string, guildName: string) {
  const reporter = await getCurrentReporter();
  if (!reporter) redirect("/api/auth/discord-user?returnTo=/certify&scope=guilds");
  if (guildId === botConfig.guildId) {
    // 허브 서버는 인증 대상이 아님 — /certify 페이지에서 이미 걸러내지만 방어적으로 한 번 더 확인.
    return;
  }

  const { cert } = await applyCertification({ guildId, guildName, applicantId: reporter.discordId });
  redirect(`/server/${cert.certNumber}`);
}

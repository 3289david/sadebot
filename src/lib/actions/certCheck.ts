"use server";

import { searchCertifications } from "@/lib/certService";

export async function checkCertification(query: string) {
  const q = query.trim();
  if (!q) return null;
  const results = await searchCertifications(q);
  // 서버 ID/인증번호 완전 일치를 우선한다.
  const exact = results.find((r) => r.guildId === q || r.certNumber === q.toUpperCase());
  const best = exact ?? results[0] ?? null;
  if (!best) return null;
  return {
    certNumber: best.certNumber,
    guildName: best.guildName,
    guildId: best.guildId,
    status: best.status,
  };
}

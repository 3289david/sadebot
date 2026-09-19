import { prisma } from "@/lib/prisma";

const WINDOW_MS = 10 * 60 * 1000; // 10분
const REPORT_LIMIT = 5; // 10분당 최대 제보 5건 (스펙 23번: 10분/100건은 명백한 어뷰징 기준이라 실사용 한도는 더 보수적으로)

function windowStart(now = Date.now()) {
  return new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS);
}

// DB 기반 슬라이딩(고정 윈도) rate limit — 재시작에도 상태 유지.
export async function checkReportRateLimit(discordId: string): Promise<{ allowed: boolean; count: number }> {
  const ws = windowStart();
  const row = await prisma.reportRateLimit.upsert({
    where: { discordId_windowStart: { discordId, windowStart: ws } },
    create: { discordId, windowStart: ws, count: 1 },
    update: { count: { increment: 1 } },
  });
  return { allowed: row.count <= REPORT_LIMIT, count: row.count };
}

// 간단한 명령어(검색 등) 스팸 방지용 인메모리 쿨다운.
const cooldowns = new Map<string, number>();

export function checkCooldown(key: string, ms: number): boolean {
  const now = Date.now();
  const last = cooldowns.get(key);
  if (last && now - last < ms) return false;
  cooldowns.set(key, now);
  return true;
}

// 오래된 쿨다운 엔트리 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of cooldowns) {
    if (now - t > 60 * 60 * 1000) cooldowns.delete(k);
  }
}, 30 * 60 * 1000).unref?.();

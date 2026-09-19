import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { botConfig } from "@/bot/config";
import { registerInteractionHandler } from "@/bot/handlers/interactionCreate";
import { registerMessageHandler } from "@/bot/handlers/messageCreate";
import { checkExpiringAndExpired } from "@/lib/certService";

const CERT_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1시간마다 인증 만료 임박/만료 처리

async function main() {
  if (!botConfig.token || !botConfig.clientId) {
    // 토큰 미설정은 초기 배포 상태에서 정상이다 — PM2가 재시작 루프에 빠지지 않도록 조용히 종료.
    console.log("[sadebot-bot] DISCORD_BOT_TOKEN/DISCORD_CLIENT_ID 미설정 — 봇을 시작하지 않습니다.");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // 자동 정보 인식(메시지 본문 스캔)에 필요 — Developer Portal에서 Privileged Intent 활성화 필요
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  registerInteractionHandler(client);
  registerMessageHandler(client);

  client.once(Events.ClientReady, (c) => {
    console.log(`[sadebot-bot] 로그인 완료: ${c.user.tag}`);
    checkExpiringAndExpired().catch((err) => console.error("[cert-expiry] initial check failed", err));
    setInterval(() => {
      checkExpiringAndExpired().catch((err) => console.error("[cert-expiry] periodic check failed", err));
    }, CERT_CHECK_INTERVAL_MS);
  });

  await client.login(botConfig.token);
}

main().catch((err) => {
  console.error("[sadebot-bot] 시작 실패", err);
  process.exit(1);
});

import "server-only";

// 웹 대시보드/웹 제보 폼에서 발생한 이벤트를 디스코드 로그 채널에도 동일하게 남기기 위한
// 경량 웹훅 알림기. discord.js 클라이언트를 웹 프로세스에 띄우지 않고도 로그 채널에 게시할 수 있다.
// (봇 프로세스에서 발생하는 이벤트는 discord.js EmbedBuilder를 그대로 사용한다 — src/bot/services/embeds.ts)

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export async function postWebhookEmbed(title: string, fields: EmbedField[], color = 0x5865f2, description?: string) {
  const url = process.env.DISCORD_LOG_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        embeds: [{ title, description, color, fields, timestamp: new Date().toISOString() }],
      }),
    });
  } catch (err) {
    console.error("[discordWebhook] failed to post", err);
  }
}

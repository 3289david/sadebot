import "server-only";

// 웹 대시보드 프로세스는 discord.js 게이트웨이 클라이언트를 띄우지 않으므로,
// 봇 토큰으로 REST API만 호출해 제보자에게 DM을 보낸다 (게이트웨이 연결 불필요).
const API = "https://discord.com/api/v10";

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export async function sendDmViaRest(userId: string, title: string, fields: EmbedField[], color = 0x5865f2, description?: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return false;

  try {
    const channelRes = await fetch(`${API}/users/@me/channels`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ recipient_id: userId }),
    });
    if (!channelRes.ok) return false;
    const channel = (await channelRes.json()) as { id: string };

    const msgRes = await fetch(`${API}/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ embeds: [{ title, description, color, fields }] }),
    });
    return msgRes.ok;
  } catch (err) {
    console.error("[discordRest] DM failed", err);
    return false;
  }
}

// 이 파일은 봇 프로세스(tsx로 직접 실행, Next.js 번들러를 거치지 않음)에서도 import되므로
// "server-only" 마커를 사용하지 않는다 (해당 패키지는 webpack 번들링 환경 밖에서는 항상 throw함).
// 웹 대시보드 프로세스는 discord.js 게이트웨이 클라이언트를 띄우지 않으므로,
// 봇 토큰으로 REST API만 호출해 제보자에게 DM을 보낸다 (게이트웨이 연결 불필요).
const API = "https://discord.com/api/v10";

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export async function sendChannelEmbed(
  channelId: string,
  title: string,
  fields: EmbedField[],
  color = 0x5865f2,
  description?: string,
  components?: unknown[],
): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !channelId) return false;

  try {
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ embeds: [{ title, description, color, fields }], components }),
    });
    if (!res.ok) console.error("[discordRest] sendChannelEmbed failed", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[discordRest] sendChannelEmbed error", err);
    return false;
  }
}

export async function fetchGuild(guildId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  const res = await fetch(`${API}/guilds/${guildId}`, { headers: { Authorization: `Bot ${token}` } });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; name: string; icon: string | null; owner_id: string }>;
}

export async function fetchGuildChannels(guildId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  const res = await fetch(`${API}/guilds/${guildId}/channels`, { headers: { Authorization: `Bot ${token}` } });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; name: string; type: number }[]>;
}

export async function fetchGuildMember(guildId: string, userId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  const res = await fetch(`${API}/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    user: { id: string; username: string; global_name: string | null };
    nick: string | null;
    roles: string[];
    joined_at: string;
  }>;
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

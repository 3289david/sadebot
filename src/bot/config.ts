function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return v;
}

export const botConfig = {
  token: process.env.DISCORD_BOT_TOKEN ?? "",
  clientId: process.env.DISCORD_CLIENT_ID ?? "",
  guildId: process.env.DISCORD_GUILD_ID ?? "",
  logChannelId: process.env.DISCORD_LOG_CHANNEL_ID ?? "",
  reportChannelId: process.env.DISCORD_REPORT_CHANNEL_ID ?? "",
  addedScammerChannelId: process.env.DISCORD_ADDED_SCAMMER_CHANNEL_ID ?? "",
  scammerSearchChannelId: process.env.DISCORD_SCAMMER_SEARCH_CHANNEL_ID ?? "",
  evidenceChannelId: process.env.DISCORD_EVIDENCE_CHANNEL_ID ?? "",
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3016",
};

export function getRequiredBotConfig() {
  return {
    token: required("DISCORD_BOT_TOKEN"),
    clientId: required("DISCORD_CLIENT_ID"),
  };
}

// 안전서버 인증을 신청하려는 다른(고객) 서버 운영자에게 안내하는 초대 링크.
// view/send/embed/attach/thread/history/reactions/use-application-commands 권한만 부여.
const BOT_INVITE_PERMISSIONS = "328565115968";

export function buildBotInviteUrl() {
  if (!botConfig.clientId) return null;
  const params = new URLSearchParams({
    client_id: botConfig.clientId,
    permissions: BOT_INVITE_PERMISSIONS,
    scope: "bot applications.commands",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

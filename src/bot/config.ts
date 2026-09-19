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
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3016",
};

export function getRequiredBotConfig() {
  return {
    token: required("DISCORD_BOT_TOKEN"),
    clientId: required("DISCORD_CLIENT_ID"),
  };
}

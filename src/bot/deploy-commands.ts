import "dotenv/config";
import { REST, Routes } from "discord.js";
import { hubCommands, globalCommands } from "@/bot/commands/index";
import { getRequiredBotConfig, botConfig } from "@/bot/config";

async function main() {
  const { token, clientId } = getRequiredBotConfig();
  const rest = new REST({ version: "10" }).setToken(token);

  // 안전서버 인증 명령어는 항상 전역 등록 — 인증을 신청하는 모든 서버에서 사용해야 하므로.
  const globalBody = globalCommands.map((c) => c.data.toJSON());
  console.log(`[deploy-commands] ${globalBody.length}개 명령어(안전서버 인증)를 전역에 등록합니다...`);
  await rest.put(Routes.applicationCommands(clientId), { body: globalBody });

  // 사기 DB/운영진 관리 명령어는 우리 서버(허브)에만 등록 — 길드 지정이 없으면 등록을 건너뛴다.
  const hubBody = hubCommands.map((c) => c.data.toJSON());
  if (botConfig.guildId) {
    console.log(`[deploy-commands] ${hubBody.length}개 명령어(사기 DB 관리)를 우리 서버(${botConfig.guildId})에 등록합니다...`);
    await rest.put(Routes.applicationGuildCommands(clientId, botConfig.guildId), { body: hubBody });
  } else {
    console.log("[deploy-commands] DISCORD_GUILD_ID가 설정되지 않아 사기 DB 관리 명령어는 등록하지 않았습니다.");
  }

  console.log("[deploy-commands] 완료.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

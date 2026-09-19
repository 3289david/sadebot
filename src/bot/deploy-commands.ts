import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "@/bot/commands/index";
import { getRequiredBotConfig, botConfig } from "@/bot/config";

async function main() {
  const { token, clientId } = getRequiredBotConfig();
  const rest = new REST({ version: "10" }).setToken(token);
  const body = commands.map((c) => c.data.toJSON());

  const route = botConfig.guildId
    ? Routes.applicationGuildCommands(clientId, botConfig.guildId)
    : Routes.applicationCommands(clientId);

  console.log(`[deploy-commands] ${body.length}개 명령어를 ${botConfig.guildId ? `길드(${botConfig.guildId})` : "전역"}에 등록합니다...`);
  await rest.put(route, { body });
  console.log("[deploy-commands] 완료.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

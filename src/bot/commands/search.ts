import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { searchCases, logSearch } from "@/bot/services/caseService";
import { buildSearchResultEmbed } from "@/bot/services/embeds";
import { checkCooldown } from "@/lib/ratelimit";

async function runSearch(query: string) {
  const results = await searchCases(query, { publicOnly: true });
  await logSearch("DISCORD");
  return buildSearchResultEmbed(query, results);
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("검색")
    .setDescription("사기 DB에서 전화번호/계좌/디스코드ID 등으로 검색합니다.")
    .addStringOption((opt) => opt.setName("검색어").setDescription("전화번호, 계좌번호, Discord ID, 닉네임 등").setRequired(true)),
  async execute(interaction) {
    if (!checkCooldown(`search:${interaction.user.id}`, 5000)) {
      await interaction.reply({ content: "⚠️ 잠시 후 다시 검색해주세요.", flags: 64 });
      return;
    }
    await interaction.deferReply({ flags: 64 });
    const query = interaction.options.getString("검색어", true);
    const embed = await runSearch(query);
    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
export { runSearch };

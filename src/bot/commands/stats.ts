import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { getStats } from "@/bot/services/statsService";
import { buildStatsEmbed } from "@/bot/services/embeds";
import { requireHubGuild } from "@/bot/services/permissions";

const command: BotCommand = {
  data: new SlashCommandBuilder().setName("통계").setDescription("사데봇 전체 통계를 확인합니다."),
  async execute(interaction) {
    if (!(await requireHubGuild(interaction))) return;
    await interaction.deferReply();
    const stats = await getStats();
    await interaction.editReply({ embeds: [buildStatsEmbed(stats)] });
  },
};

export default command;

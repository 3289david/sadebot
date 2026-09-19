import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { buildReportModal } from "@/bot/services/reportFlow";
import { requireHubGuild } from "@/bot/services/permissions";

const command: BotCommand = {
  data: new SlashCommandBuilder().setName("신고").setDescription("사기 피해를 제보합니다."),
  async execute(interaction) {
    if (!(await requireHubGuild(interaction))) return;
    await interaction.showModal(buildReportModal());
  },
};

export default command;

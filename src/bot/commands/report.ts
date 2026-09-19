import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { buildReportModal } from "@/bot/services/reportFlow";

const command: BotCommand = {
  data: new SlashCommandBuilder().setName("신고").setDescription("사기 피해를 제보합니다."),
  async execute(interaction) {
    await interaction.showModal(buildReportModal());
  },
};

export default command;

import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { buildDisputeModal } from "@/bot/services/reportFlow";
import { prisma } from "@/lib/prisma";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("이의제기")
    .setDescription("등록된 사건에 대해 이의를 제기합니다.")
    .addStringOption((opt) => opt.setName("사건번호").setDescription("예: A10291").setRequired(true)),
  async execute(interaction) {
    const raw = interaction.options.getString("사건번호", true).toUpperCase().replace(/^CASE#?/, "").trim();
    const exists = await prisma.case.findUnique({ where: { caseNumber: raw } });
    if (!exists) {
      await interaction.reply({ content: `❌ CASE #${raw} 를 찾을 수 없습니다.`, flags: 64 });
      return;
    }
    await interaction.showModal(buildDisputeModal(raw));
  },
};

export default command;

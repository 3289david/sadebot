import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { checkCooldown } from "@/lib/ratelimit";
import { runSearch } from "@/bot/commands/search";

// 사용자 요청 스펙의 "사기꾼 검색" 기능 — /검색과 동일한 로직을 쓰되 별도 명령어명으로 제공.
const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("사기꾼검색")
    .setDescription("닉네임/연락처/계좌 등으로 사기 제보 이력을 검색합니다.")
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

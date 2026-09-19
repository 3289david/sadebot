import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { prisma } from "@/lib/prisma";
import { buildCaseDetailEmbedPublic } from "@/bot/services/embeds";

const PUBLIC_STATUSES = ["REVIEWING", "NEEDS_MORE_INFO", "VERIFIED", "DISPUTED", "ON_HOLD", "EXPLAINED"];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("사건")
    .setDescription("사건 번호로 상세 정보를 조회합니다. (마스킹된 공개 정보)")
    .addStringOption((opt) => opt.setName("사건번호").setDescription("예: A10291").setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    const raw = interaction.options.getString("사건번호", true).toUpperCase().replace(/^CASE#?/, "").trim();

    const c = await prisma.case.findFirst({
      where: { caseNumber: raw, status: { in: PUBLIC_STATUSES as never } },
      include: { identifiers: true, _count: { select: { reports: true, evidence: true, disputes: true } } },
    });

    if (!c) {
      await interaction.editReply(`❌ CASE #${raw} 를 찾을 수 없거나 아직 공개되지 않았습니다.`);
      return;
    }

    const embed = buildCaseDetailEmbedPublic({
      caseNumber: c.caseNumber,
      status: c.status,
      damageType: c.damageType,
      occurredAt: c.occurredAt,
      platform: c.platform,
      description: c.description,
      identifiers: c.identifiers.map((i) => ({ type: i.type, value: i.value })),
      reportCount: c._count.reports,
      evidenceCount: c._count.evidence,
      disputeCount: c._count.disputes,
    });
    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;

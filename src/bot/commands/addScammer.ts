import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { checkBotPermission, requireHubGuild } from "@/bot/services/permissions";
import { createCase, changeCaseStatus } from "@/bot/services/caseService";
import { logAudit } from "@/lib/audit";
import { buildDbRegisterLogEmbed } from "@/bot/services/embeds";
import { botConfig } from "@/bot/config";
import { DAMAGE_TYPES, IDENTIFIER_LABEL } from "@/lib/constants";
import type { IdentifierType } from "@prisma/client";

const IDENTIFIER_CHOICES: { name: string; value: IdentifierType }[] = [
  "DISCORD_ID", "DISCORD_USERNAME", "PHONE", "BANK_ACCOUNT", "ACCOUNT_HOLDER",
  "EMAIL", "TRADE_SITE", "GAME_NICK", "SELLER_NICK", "WEBSITE", "WALLET_ADDRESS", "PLATFORM_ID",
].map((t) => ({ name: IDENTIFIER_LABEL[t] ?? t, value: t as IdentifierType }));

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("사기꾼추가")
    .setDescription("[운영진 전용] 검증된 사기꾼 정보를 DB에 직접 등록합니다.")
    .addStringOption((opt) =>
      opt.setName("식별자유형").setDescription("등록할 정보 종류").setRequired(true).addChoices(...IDENTIFIER_CHOICES),
    )
    .addStringOption((opt) => opt.setName("식별자값").setDescription("예: 010-1234-5678").setRequired(true))
    .addStringOption((opt) =>
      opt.setName("피해유형").setDescription("피해 유형").setRequired(true).addChoices(...DAMAGE_TYPES.map((d) => ({ name: d, value: d }))),
    )
    .addStringOption((opt) => opt.setName("설명").setDescription("사건 설명 / 근거").setRequired(true))
    .addIntegerOption((opt) => opt.setName("피해금액").setDescription("원 단위").setRequired(false))
    .addStringOption((opt) => opt.setName("플랫폼").setDescription("관련 플랫폼").setRequired(false)),
  async execute(interaction) {
    if (!(await requireHubGuild(interaction))) return;
    const perm = await checkBotPermission(interaction.user.id, "REVIEW_REPORT");
    if (!perm.ok || !perm.adminId) {
      await interaction.reply({ content: "⛔ 이 명령어는 운영진만 사용할 수 있습니다.", flags: 64 });
      return;
    }

    await interaction.deferReply({ flags: 64 });
    const idType = interaction.options.getString("식별자유형", true) as IdentifierType;
    const idValue = interaction.options.getString("식별자값", true);
    const damageType = interaction.options.getString("피해유형", true);
    const description = interaction.options.getString("설명", true);
    const damageAmount = interaction.options.getInteger("피해금액") ?? null;
    const platform = interaction.options.getString("플랫폼");

    const { case: created } = await createCase({
      damageType,
      damageAmount,
      occurredAt: null,
      description,
      platform,
      autoExtracted: false,
      identifiers: [{ type: idType, value: idValue, source: "MANUAL" }],
    });

    await changeCaseStatus({ caseId: created.id, newStatus: "VERIFIED", actorId: perm.adminId, message: "운영진 직접 등록" });

    await logAudit({
      actorId: perm.adminId,
      action: "CASE_DIRECT_ADD",
      targetType: "Case",
      targetId: created.id,
      detail: { identifierType: idType },
    });

    await interaction.editReply(`✅ CASE #${created.caseNumber} 로 등록되었습니다.`);

    if (botConfig.logChannelId) {
      const logChannel = await interaction.client.channels.fetch(botConfig.logChannelId).catch(() => null);
      if (logChannel?.isTextBased() && "send" in logChannel) {
        await logChannel.send({
          embeds: [
            buildDbRegisterLogEmbed({
              caseNumber: created.caseNumber,
              reason: "운영진 직접 등록 (/사기꾼추가)",
              reviewerTag: `<@${interaction.user.id}>`,
              identifiers: [{ type: idType, value: idValue }],
            }),
          ],
        });
      }
    }
  },
};

export default command;

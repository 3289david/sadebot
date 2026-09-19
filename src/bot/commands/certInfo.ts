import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { prisma } from "@/lib/prisma";
import { CERT_STATUS_LABEL } from "@/lib/certService";
import { EMBED_COLOR } from "@/lib/constants";
import { botConfig } from "@/bot/config";

const TEST_TYPE_LABEL: Record<string, string> = {
  BOT_INSTALLED: "인증 봇 설치",
  ORDER_PROCESSING: "주문 처리",
  PAYMENT_PROCESSING: "결제 처리",
  PRODUCT_DELIVERY: "상품/서비스 제공",
  TRADE_COMPLIANCE: "거래 약속 준수",
  INQUIRY_RESPONSE: "문의 응답",
  REFUND_POLICY: "환불 정책",
  POST_SALE_SUPPORT: "거래 후 대응",
  TERMS_POLICY: "약관/운영정책",
};

const RESULT_ICON: Record<string, string> = { PASS: "✅", FAIL: "❌", NA: "➖" };

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("인증정보")
    .setDescription("서버의 안전서버 인증 상태를 확인합니다.")
    .addStringOption((opt) => opt.setName("서버id").setDescription("다른 서버의 인증 상태를 확인하려면 서버 ID (기본: 현재 서버)").setRequired(false))
    .setDMPermission(false),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "이 명령어는 서버 안에서만 사용할 수 있습니다.", flags: 64 });
      return;
    }

    const targetGuildId = interaction.options.getString("서버id") ?? interaction.guild.id;

    await interaction.deferReply();
    const cert = await prisma.serverCertification.findUnique({
      where: { guildId: targetGuildId },
      include: { testItems: true },
    });

    if (!cert) {
      await interaction.editReply("⚪ 그 서버는 안전서버 인증을 받지 않았습니다.\n서버 관리자는 `/안전서버인증신청` 으로 신청할 수 있습니다.");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(cert.status === "ACTIVE" ? EMBED_COLOR.success : EMBED_COLOR.neutral)
      .setTitle(`🛡️ ${cert.guildName ?? targetGuildId}`)
      .addFields(
        { name: "안전서버 인증", value: CERT_STATUS_LABEL[cert.status], inline: true },
        { name: "인증번호", value: cert.certNumber, inline: true },
        ...(cert.expiresAt ? [{ name: "만료일", value: cert.expiresAt.toISOString().slice(0, 10), inline: true }] : []),
        {
          name: "확인 항목",
          value: cert.testItems.map((t) => `${RESULT_ICON[t.result]} ${TEST_TYPE_LABEL[t.testType] ?? t.testType}`).join("\n"),
        },
        { name: "인증 페이지", value: `${botConfig.baseUrl}/server/${cert.certNumber}` },
      )
      .setFooter({ text: "⚠️ 인증은 특정 서버가 모든 거래에서 문제가 없다는 것을 보장하는 의미가 아닙니다." });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;

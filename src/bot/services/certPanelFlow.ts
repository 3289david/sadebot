import { EmbedBuilder, PermissionFlagsBits, type ButtonInteraction } from "discord.js";
import { prisma } from "@/lib/prisma";
import { applyCertification, reapplyCertification, CERT_STATUS_LABEL } from "@/lib/certService";
import { EMBED_COLOR } from "@/lib/constants";
import { botConfig } from "@/bot/config";
import type { CertTestType } from "@prisma/client";

const TEST_TYPE_LABEL: Record<CertTestType, string> = {
  BOT_INSTALLED: "인증 봇 설치 확인",
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

function requireGuildManager(interaction: ButtonInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

export async function handleCertApplyButton(interaction: ButtonInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "이 버튼은 서버 안에서만 사용할 수 있습니다.", flags: 64 });
    return;
  }
  if (!requireGuildManager(interaction)) {
    await interaction.reply({ content: "⛔ 이 서버의 '서버 관리' 권한이 있는 사용자만 신청할 수 있습니다.", flags: 64 });
    return;
  }

  await interaction.deferReply({ flags: 64 });
  const { cert, isNew } = await applyCertification({
    guildId: interaction.guild.id,
    guildName: interaction.guild.name,
    applicantId: interaction.user.id,
  });

  if (!isNew) {
    await interaction.editReply(
      `이미 인증 신청 이력이 있는 서버입니다.\n\n인증번호: ${cert.certNumber}\n현재 상태: ${CERT_STATUS_LABEL[cert.status]}\n\n갱신하려면 재인증 버튼을 사용해주세요.`,
    );
    return;
  }

  await interaction.editReply(
    [
      "🛡️ **안전서버 인증**",
      "",
      "서버 인증 절차가 시작되었습니다.",
      "",
      `서버: ${interaction.guild.name}`,
      `서버 ID: ${interaction.guild.id}`,
      `인증번호: ${cert.certNumber}`,
      "",
      `현재 상태: ${CERT_STATUS_LABEL[cert.status]}`,
      "",
      "운영팀이 서버 기본 정보를 확인한 뒤, 비공개 안전거래 테스트를 진행합니다.",
    ].join("\n"),
  );
}

export async function handleCertReapplyButton(interaction: ButtonInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "이 버튼은 서버 안에서만 사용할 수 있습니다.", flags: 64 });
    return;
  }
  if (!requireGuildManager(interaction)) {
    await interaction.reply({ content: "⛔ 이 서버의 '서버 관리' 권한이 있는 사용자만 신청할 수 있습니다.", flags: 64 });
    return;
  }

  const existing = await prisma.serverCertification.findUnique({ where: { guildId: interaction.guild.id } });
  if (!existing) {
    await interaction.reply({ content: "인증 신청 이력이 없습니다. 먼저 '인증 신청' 버튼을 사용해주세요.", flags: 64 });
    return;
  }

  await interaction.deferReply({ flags: 64 });
  const updated = await reapplyCertification({ guildId: interaction.guild.id, actorId: interaction.user.id });
  await interaction.editReply(
    `🔄 재인증 신청 완료\n\n인증번호: ${updated.certNumber}\n현재 상태: ${CERT_STATUS_LABEL[updated.status]}`,
  );
}

export async function handleCertInfoButton(interaction: ButtonInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "이 버튼은 서버 안에서만 사용할 수 있습니다.", flags: 64 });
    return;
  }

  await interaction.deferReply({ flags: 64 });
  const cert = await prisma.serverCertification.findUnique({
    where: { guildId: interaction.guild.id },
    include: { testItems: true },
  });

  if (!cert) {
    await interaction.editReply("⚪ 이 서버는 안전서버 인증을 받지 않았습니다.\n서버 관리자는 '인증 신청' 버튼으로 신청할 수 있습니다.");
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(cert.status === "ACTIVE" ? EMBED_COLOR.success : EMBED_COLOR.neutral)
    .setTitle(`🛡️ ${cert.guildName ?? interaction.guild.name}`)
    .addFields(
      { name: "안전서버 인증", value: CERT_STATUS_LABEL[cert.status], inline: true },
      { name: "인증번호", value: cert.certNumber, inline: true },
      ...(cert.expiresAt ? [{ name: "만료일", value: cert.expiresAt.toISOString().slice(0, 10), inline: true }] : []),
      { name: "확인 항목", value: cert.testItems.map((t) => `${RESULT_ICON[t.result]} ${TEST_TYPE_LABEL[t.testType] ?? t.testType}`).join("\n") },
      { name: "인증 페이지", value: `${botConfig.baseUrl}/server/${cert.certNumber}` },
    );

  await interaction.editReply({ embeds: [embed] });
}

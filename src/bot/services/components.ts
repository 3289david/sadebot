import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function buildReviewActionRow(caseId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`case:view:${caseId}`).setLabel("상세보기").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`review:${caseId}:approve`).setLabel("✅ 승인").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`review:${caseId}:needinfo`).setLabel("🟠 추가자료 요청").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`review:${caseId}:hold`).setLabel("⏸ 보류").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`review:${caseId}:reject`).setLabel("❌ 반려").setStyle(ButtonStyle.Danger),
  );
}

export function buildDisputeActionRow(disputeId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`dispute:${disputeId}:keep`).setLabel("유지").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dispute:${disputeId}:hide`).setLabel("임시 비공개").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dispute:${disputeId}:needinfo`).setLabel("추가자료 요청").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dispute:${disputeId}:delete`).setLabel("삭제").setStyle(ButtonStyle.Danger),
  );
}

export function buildDuplicateActionRow(newCaseId: string, existingCaseId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`duplicate:${newCaseId}:${existingCaseId}:link`).setLabel("기존 사건에 연결").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`duplicate:${newCaseId}:${existingCaseId}:separate`).setLabel("새로운 사건으로 등록").setStyle(ButtonStyle.Secondary),
  );
}

export function buildPanelSearchRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("panel:search").setLabel("🔍 검색하기").setStyle(ButtonStyle.Primary),
  );
}

export function buildPanelReportRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("panel:report").setLabel("🚨 제보하기").setStyle(ButtonStyle.Danger),
  );
}

export function buildPanelDisputeRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("panel:dispute").setLabel("⚖️ 이의제기").setStyle(ButtonStyle.Secondary),
  );
}

export function buildPanelStatsRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("panel:stats").setLabel("📊 통계 보기").setStyle(ButtonStyle.Secondary),
  );
}

export function buildPanelCertRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("panel:cert_apply").setLabel("🛡️ 인증 신청").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("panel:cert_reapply").setLabel("🔄 재인증").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("panel:cert_info").setLabel("ℹ️ 인증정보 확인").setStyle(ButtonStyle.Primary),
  );
}

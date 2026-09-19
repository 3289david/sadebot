import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { THECHEAT_URL } from "@/lib/constants";

// 우리 DB 검색 결과 아래에 경찰청 사이버범죄 신고·예방 페이지 링크를 붙여준다 — 자동 조회가 아니라
// 사용자가 직접 눌러서 이동하는 외부 링크. 우리 DB만으로 부족할 수 있다는 걸 인지시키는 용도.
export function buildTheCheatLinkRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("🔗 경찰청 사이버범죄 확인하기").setStyle(ButtonStyle.Link).setURL(THECHEAT_URL),
  );
}

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

// 우리(허브) 서버는 인증 대상이 아니므로, 이 패널은 "여러분의 서버"를 인증받고 싶은
// 다른 서버 운영자를 위한 것이다 — 봇 초대 링크 / 웹 신청 링크 / 여기서 바로 신청·재인증 / 인증서버 검색.
export function buildPanelCertRow(inviteUrl: string | null, applyUrl: string) {
  const row = new ActionRowBuilder<ButtonBuilder>();
  if (inviteUrl) row.addComponents(new ButtonBuilder().setLabel("🔗 봇 초대하기").setStyle(ButtonStyle.Link).setURL(inviteUrl));
  row.addComponents(new ButtonBuilder().setLabel("🌐 웹에서 신청하기").setStyle(ButtonStyle.Link).setURL(applyUrl));
  row.addComponents(new ButtonBuilder().setCustomId("panel:cert_apply_here").setLabel("📝 여기서 신청").setStyle(ButtonStyle.Success));
  row.addComponents(new ButtonBuilder().setCustomId("panel:cert_reapply_here").setLabel("🔄 여기서 재인증").setStyle(ButtonStyle.Secondary));
  row.addComponents(new ButtonBuilder().setCustomId("panel:cert_search").setLabel("🔍 인증서버 검색").setStyle(ButtonStyle.Primary));
  return row;
}

import { EmbedBuilder } from "discord.js";
import { EMBED_COLOR, IDENTIFIER_LABEL, STATUS_LABEL, EVIDENCE_LABEL, DISPUTE_REASON_LABEL } from "@/lib/constants";
import { maskByType } from "@/lib/mask";
import type { ExtractedIdentifier } from "@/lib/extract";
import type { DuplicateMatch } from "@/lib/duplicates";

type CaseLite = {
  caseNumber: string;
  status: string;
  damageType: string;
  damageAmount: number | null;
  platform: string | null;
  createdAt: Date;
  _count?: { reports: number; evidence: number; disputes: number };
};

export function buildSearchResultEmbed(query: string, results: (CaseLite & { matchedIdentifiers: { type: string; value: string }[] })[]) {
  if (results.length === 0) {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.neutral)
      .setTitle("🔎 사기 DB 검색")
      .setDescription(`검색어\n> ${query}\n\n일치하는 제보가 없습니다.`)
      .setFooter({ text: "※ 결과 없음이 무혐의를 의미하지는 않습니다." });
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR.warn)
    .setTitle("🔎 사기 DB 검색 결과")
    .setDescription(`검색어\n> ${query}\n\n⚠️ 관련 제보 ${results.length}건`);

  for (const r of results.slice(0, 10)) {
    const idLines = r.matchedIdentifiers
      .map((i) => `• ${IDENTIFIER_LABEL[i.type] ?? i.type}: ${maskByType(i.type as never, i.value)}`)
      .join("\n");
    embed.addFields({
      name: `CASE #${r.caseNumber} · ${STATUS_LABEL[r.status] ?? r.status}`,
      value: [
        `유형: ${r.damageType}`,
        r.platform ? `관련 플랫폼: ${r.platform}` : null,
        idLines || null,
        r._count ? `제보 ${r._count.reports}건 · 증거 ${r._count.evidence}개` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }
  embed.setFooter({ text: "※ DB 정보만으로 범죄 사실이 확정되는 것은 아닙니다. 전체 식별정보는 마스킹되어 있습니다." });
  return embed;
}

export function buildCaseDetailEmbedPublic(c: {
  caseNumber: string;
  status: string;
  damageType: string;
  occurredAt: Date | null;
  platform: string | null;
  description: string;
  identifiers: { type: string; value: string }[];
  reportCount: number;
  evidenceCount: number;
  disputeCount: number;
}) {
  const idLines = c.identifiers
    .map((i) => `• ${IDENTIFIER_LABEL[i.type] ?? i.type}: ${maskByType(i.type as never, i.value)}`)
    .join("\n") || "등록된 연관 식별자 없음";

  return new EmbedBuilder()
    .setColor(EMBED_COLOR.info)
    .setTitle(`CASE #${c.caseNumber}`)
    .addFields(
      { name: "상태", value: STATUS_LABEL[c.status] ?? c.status, inline: true },
      { name: "유형", value: c.damageType, inline: true },
      { name: "관련 플랫폼", value: c.platform ?? "미상", inline: true },
      { name: "발생일", value: c.occurredAt ? c.occurredAt.toISOString().slice(0, 10) : "미상", inline: true },
      { name: "연관 식별자 (마스킹)", value: idLines },
      { name: "제보", value: `${c.reportCount}건`, inline: true },
      { name: "증거", value: `${c.evidenceCount}개`, inline: true },
      { name: "이의제기", value: `${c.disputeCount}건`, inline: true },
      { name: "사건 설명", value: c.description.slice(0, 500) },
    )
    .setFooter({ text: "※ 본 정보만으로 범죄 사실이 확정되는 것은 아닙니다. 이의제기가 가능합니다." });
}

export function buildAutoExtractEmbed(identifiers: ExtractedIdentifier[], damageAmount: number | null, damageType: string | null) {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR.warn)
    .setTitle("🤖 자동 인식 결과")
    .setDescription("⚠️ 자동 추출 결과입니다.\n등록 전에 운영진 확인이 필요합니다.");

  for (const id of identifiers) {
    embed.addFields({ name: IDENTIFIER_LABEL[id.type] ?? id.type, value: id.value, inline: true });
  }
  if (damageAmount) embed.addFields({ name: "💰 피해금액(추정)", value: `${damageAmount.toLocaleString()}원`, inline: true });
  if (damageType) embed.addFields({ name: "📌 피해 유형(추정)", value: damageType, inline: true });
  if (identifiers.length === 0 && !damageAmount && !damageType) {
    embed.addFields({ name: "결과 없음", value: "자동으로 인식된 식별정보가 없습니다. 수동으로 /신고 명령어를 사용해주세요." });
  }
  return embed;
}

export function buildNewReportLogEmbed(params: {
  caseNumber: string;
  reporterTag: string;
  damageType: string;
  damageAmount: number | null;
  platform: string | null;
  autoIdentifierTypes: string[];
  evidenceCount: number;
}) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.danger)
    .setTitle("🚨 신규 사기 제보")
    .addFields(
      { name: "Case", value: `#${params.caseNumber}`, inline: true },
      { name: "제보자", value: params.reporterTag, inline: true },
      { name: "유형", value: params.damageType, inline: true },
      { name: "피해금액", value: params.damageAmount ? `₩${params.damageAmount.toLocaleString()}` : "미상", inline: true },
      { name: "관련 플랫폼", value: params.platform ?? "미상", inline: true },
      {
        name: "자동 인식 정보",
        value: params.autoIdentifierTypes.length
          ? params.autoIdentifierTypes.map((t) => `• ${IDENTIFIER_LABEL[t] ?? t}`).join("\n")
          : "없음",
      },
      { name: "증거", value: `${params.evidenceCount}개`, inline: true },
      { name: "상태", value: "🟡 검토 필요", inline: true },
    );
}

export function buildDbRegisterLogEmbed(params: { caseNumber: string; reason: string; reviewerTag: string; addedFields: string[] }) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.success)
    .setTitle("📕 DB 등록")
    .addFields(
      { name: "Case", value: `#${params.caseNumber}`, inline: true },
      { name: "등록 사유", value: params.reason },
      { name: "검토 담당자", value: params.reviewerTag, inline: true },
      { name: "등록일", value: new Date().toISOString().replace("T", " ").slice(0, 19), inline: true },
      { name: "변경된 정보", value: params.addedFields.map((f) => `+ ${f}`).join("\n") || "없음" },
    );
}

export function buildEditLogEmbed(params: { caseNumber: string; field: string; editorTag: string; before: string; after: string; reason?: string }) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.warn)
    .setTitle("📝 DB 수정")
    .addFields(
      { name: "CASE", value: `#${params.caseNumber}`, inline: true },
      { name: "변경 항목", value: params.field, inline: true },
      { name: "변경자", value: params.editorTag, inline: true },
      { name: "변경 전", value: params.before || "-" },
      { name: "변경 후", value: params.after || "-" },
      ...(params.reason ? [{ name: "사유", value: params.reason }] : []),
    );
}

export function buildDeleteLogEmbed(params: { caseNumber: string; actorTag: string; reason: string }) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.danger)
    .setTitle("🗑️ DB 삭제")
    .addFields(
      { name: "CASE", value: `#${params.caseNumber}`, inline: true },
      { name: "삭제자", value: params.actorTag, inline: true },
      { name: "삭제 사유", value: params.reason },
      { name: "삭제 시간", value: new Date().toISOString().replace("T", " ").slice(0, 19) },
    );
}

export function buildDuplicateLinkEmbed(matches: DuplicateMatch[]) {
  const byCase = new Map<string, DuplicateMatch[]>();
  for (const m of matches) {
    const arr = byCase.get(m.caseNumber) ?? [];
    arr.push(m);
    byCase.set(m.caseNumber, arr);
  }
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR.warn)
    .setTitle("🔗 기존 사건과 연결된 정보 발견")
    .setDescription("⚠️ 정보가 하나 일치한다고 동일인으로 자동 확정되지 않습니다. 운영진 검토가 필요합니다.");

  for (const [caseNumber, ms] of byCase) {
    embed.addFields({
      name: `기존 CASE #${caseNumber}`,
      value: ms.map((m) => `• ${IDENTIFIER_LABEL[m.matchType] ?? m.matchType} 일치`).join("\n"),
    });
  }
  return embed;
}

export function buildDisputeEmbed(params: {
  caseNumber: string;
  reason: string;
  reasonDetail: string;
  evidenceCount: number;
  currentStatus: string;
}) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.danger)
    .setTitle("⚖️ 이의제기")
    .addFields(
      { name: "CASE", value: `#${params.caseNumber}`, inline: true },
      { name: "현재 상태", value: STATUS_LABEL[params.currentStatus] ?? params.currentStatus, inline: true },
      { name: "사유", value: DISPUTE_REASON_LABEL[params.reason] ?? params.reason },
      { name: "상세 내용", value: params.reasonDetail },
      { name: "첨부 증거", value: `${params.evidenceCount}개`, inline: true },
    );
}

export function buildStatusChangeDmEmbed(params: { caseNumber: string; before: string; after: string; message?: string }) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.info)
    .setTitle("📢 제보 상태 변경")
    .addFields(
      { name: "CASE", value: `#${params.caseNumber}`, inline: true },
      { name: "이전", value: STATUS_LABEL[params.before] ?? params.before, inline: true },
      { name: "현재", value: STATUS_LABEL[params.after] ?? params.after, inline: true },
      ...(params.message ? [{ name: "운영진 메시지", value: params.message }] : []),
    );
}

export function buildReceivedDmEmbed(caseNumber: string) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.success)
    .setTitle("✅ 제보가 접수되었습니다.")
    .addFields(
      { name: "사건 번호", value: `CASE #${caseNumber}`, inline: true },
      { name: "현재 상태", value: "🟡 검토 중", inline: true },
    )
    .setDescription("운영진 검토 후 결과가 안내됩니다.");
}

export function buildStatsEmbed(stats: {
  total: number;
  reviewing: number;
  verified: number;
  disputed: number;
  deleted: number;
  monthlyReports: number;
  monthlySearches: number;
  byDamageType: { type: string; count: number }[];
}) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.neutral)
    .setTitle("📊 사데봇 통계")
    .addFields(
      { name: "전체 사건", value: `${stats.total}`, inline: true },
      { name: "검토중", value: `${stats.reviewing}`, inline: true },
      { name: "검증완료", value: `${stats.verified}`, inline: true },
      { name: "이의제기", value: `${stats.disputed}`, inline: true },
      { name: "삭제됨", value: `${stats.deleted}`, inline: true },
      { name: "이번 달 제보", value: `${stats.monthlyReports}`, inline: true },
      { name: "이번 달 검색", value: `${stats.monthlySearches}`, inline: true },
      {
        name: "🏆 피해 유형 통계",
        value: stats.byDamageType.map((d) => `${d.type.padEnd(10, " ")} ${d.count}`).join("\n") || "데이터 없음",
      },
    );
}

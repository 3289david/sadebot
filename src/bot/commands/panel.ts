import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import type { BotCommand } from "@/bot/commands/types";
import { EMBED_COLOR } from "@/lib/constants";
import {
  buildPanelSearchRow,
  buildPanelReportRow,
  buildPanelDisputeRow,
  buildPanelStatsRow,
  buildPanelCertRow,
} from "@/bot/services/components";
import { botConfig, buildBotInviteUrl } from "@/bot/config";
import { requireHubGuild } from "@/bot/services/permissions";

function searchPanelEmbed() {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.info)
    .setTitle("🔎 사기 DB 검색")
    .setDescription(
      "전화번호, 계좌번호, Discord ID, 닉네임, 이메일 등 하나만 입력해도 관련 제보를 찾아드립니다.\n\n버튼을 눌러 검색어를 입력하세요.\n(슬래시 명령어: `/검색`, `/사기꾼검색`)",
    )
    .setFooter({ text: "※ 전화번호·계좌번호만 마스킹되어 표시되며, DB 등재만으로 범죄 사실이 확정되지 않습니다." });
}

function reportPanelEmbed() {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.danger)
    .setTitle("🚨 사기 제보")
    .setDescription(
      "피해를 입으셨다면 아래 버튼으로 제보해주세요.\n필수: 피해 유형 / 사건 설명\n선택: 상대방 정보, 관련 플랫폼\n\n접수 후 스레드가 열리면 증거 자료(캡처, 송금내역 등)를 첨부해주세요.\n(슬래시 명령어: `/신고`)",
    )
    .setFooter({ text: "※ 허위 제보는 이의제기 및 운영진 검토를 통해 반려/삭제될 수 있습니다." });
}

function disputePanelEmbed() {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.warn)
    .setTitle("⚖️ 이의제기")
    .setDescription(
      "본인과 관련된 제보가 사실과 다르다면 이의를 제기할 수 있습니다.\n사건번호와 사유, 상세 내용을 입력해주세요.\n(슬래시 명령어: `/이의제기 사건번호:A10291`)",
    )
    .setFooter({ text: "이의제기는 운영진이 검토 후 유지/수정/비공개/삭제 여부를 결정합니다." });
}

function statsPanelEmbed() {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.neutral)
    .setTitle("📊 사데봇 통계")
    .setDescription("버튼을 눌러 현재 DB 통계를 확인하세요.\n(슬래시 명령어: `/통계`)");
}

function infoPanelEmbed() {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.neutral)
    .setTitle("🛡️ 사데봇 안내")
    .setDescription(
      [
        "**사데봇**은 사기 제보를 접수하고, 검증을 거쳐 검색 가능한 형태로 제공하는 커뮤니티 안전 도구입니다.",
        "",
        "• 전화번호/계좌번호는 공개 화면에서 항상 마스킹됩니다. (그 외 정보는 전체 공개)",
        "• 모든 제보는 운영진 검토를 거치며, 검토 전에는 검색에 노출되지 않습니다.",
        "• 등록된 당사자는 언제든 `/이의제기` 로 소명할 수 있습니다.",
        "• 허위/악의적 제보로 확인될 경우 해당 계정에 제재가 있을 수 있습니다.",
        botConfig.baseUrl ? `• 웹에서도 검색/제보가 가능합니다: ${botConfig.baseUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
}

function certPanelEmbed() {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.success)
    .setTitle("🛡️ 안전서버 인증")
    .setDescription(
      [
        "**여러분의 디스코드 서버**가 실제로 안전하게 거래를 처리하는지 운영팀이 직접 확인하고 인증해드립니다.",
        "(이 서버 자체는 사데봇 관리 서버라 인증 대상이 아닙니다.)",
        "",
        "🔍 신청 시 자동으로 확인: 인증 봇 설치 여부, 거래/환불/약관/문의 관련 채널 존재 여부",
        "🕵️ 이후 운영팀이 비공개로 안전거래 테스트를 진행합니다.",
        "",
        "**신청 방법**",
        "1️⃣ 아래 버튼으로 사데봇을 여러분의 서버에 초대 (서버 관리 권한 필요)",
        "2️⃣ 여러분의 서버에서 `/안전서버인증신청` 실행, 또는 웹에서 바로 신청",
      ].join("\n"),
    )
    .setFooter({ text: "⚠️ 인증은 특정 서버가 모든 거래에서 문제가 없다는 것을 보장하는 의미가 아닙니다." });
}

const PANEL_TYPES = ["검색", "제보", "이의제기", "통계", "안내", "안전서버", "전체"] as const;

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("패널설치")
    .setDescription("[운영진 전용] 현재 채널에 사용자용 패널 임베드를 설치합니다.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName("종류")
        .setDescription("설치할 패널 종류")
        .setRequired(true)
        .addChoices(...PANEL_TYPES.map((t) => ({ name: t, value: t }))),
    ),
  async execute(interaction) {
    if (!(await requireHubGuild(interaction))) return;
    if (!interaction.channel?.isSendable()) {
      await interaction.reply({ content: "이 채널에는 메시지를 보낼 수 없습니다.", flags: 64 });
      return;
    }
    const type = interaction.options.getString("종류", true) as (typeof PANEL_TYPES)[number];
    await interaction.reply({ content: `✅ '${type}' 패널을 설치했습니다.`, flags: 64 });

    const jobs: Promise<unknown>[] = [];
    if (type === "검색" || type === "전체") jobs.push(interaction.channel.send({ embeds: [searchPanelEmbed()], components: [buildPanelSearchRow()] }));
    if (type === "제보" || type === "전체") jobs.push(interaction.channel.send({ embeds: [reportPanelEmbed()], components: [buildPanelReportRow()] }));
    if (type === "이의제기" || type === "전체") jobs.push(interaction.channel.send({ embeds: [disputePanelEmbed()], components: [buildPanelDisputeRow()] }));
    if (type === "통계" || type === "전체") jobs.push(interaction.channel.send({ embeds: [statsPanelEmbed()], components: [buildPanelStatsRow()] }));
    if (type === "안내" || type === "전체") jobs.push(interaction.channel.send({ embeds: [infoPanelEmbed()] }));
    if (type === "안전서버" || type === "전체") {
      jobs.push(
        interaction.channel.send({
          embeds: [certPanelEmbed()],
          components: [buildPanelCertRow(buildBotInviteUrl(), `${botConfig.baseUrl}/certify`)],
        }),
      );
    }
    await Promise.all(jobs);
  },
};

export default command;

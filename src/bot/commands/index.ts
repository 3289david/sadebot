import type { BotCommand } from "@/bot/commands/types";
import report from "@/bot/commands/report";
import search from "@/bot/commands/search";
import scammerSearch from "@/bot/commands/scammerSearch";
import caseLookup from "@/bot/commands/caseLookup";
import dispute from "@/bot/commands/dispute";
import addScammer from "@/bot/commands/addScammer";
import panel from "@/bot/commands/panel";
import stats from "@/bot/commands/stats";
import adminManage from "@/bot/commands/adminManage";
import certApply from "@/bot/commands/certApply";
import certReapply from "@/bot/commands/certReapply";
import certInfo from "@/bot/commands/certInfo";

// 우리 서버(사데봇 관리/DB 서버) 전용 명령어 — 길드 커맨드로만 등록되어 DISCORD_GUILD_ID 서버에서만 보인다.
// 사기 제보 DB, 운영진 관리 등 민감한 기능이라 아무 서버에나 노출되면 안 된다.
export const hubCommands: BotCommand[] = [report, search, scammerSearch, caseLookup, dispute, addScammer, panel, stats, adminManage];

// 안전서버 인증 명령어 — 전역(global) 커맨드로 등록되어 봇이 초대된 모든 서버(인증 신청 서버 포함)에서 사용 가능.
export const globalCommands: BotCommand[] = [certApply, certReapply, certInfo];

export const commands: BotCommand[] = [...hubCommands, ...globalCommands];

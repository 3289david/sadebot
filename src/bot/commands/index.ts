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

export const commands: BotCommand[] = [
  report, search, scammerSearch, caseLookup, dispute, addScammer, panel, stats, adminManage,
  certApply, certReapply, certInfo,
];

import { Events, type Client, type Interaction } from "discord.js";
import { commands } from "@/bot/commands/index";
import {
  REPORT_MODAL_ID,
  DISPUTE_MODAL_ID,
  PANEL_SEARCH_MODAL_ID,
  PANEL_DISPUTE_MODAL_ID,
  handleReportModalSubmit,
  handleDisputeModalSubmit,
  handlePanelSearchModalSubmit,
  handlePanelDisputeModalSubmit,
  buildReportModal,
  buildPanelSearchModal,
  buildPanelDisputeModal,
} from "@/bot/services/reportFlow";
import {
  handleReviewButton,
  handleNeedInfoModalSubmit,
  handleRejectModalSubmit,
  handleCaseViewButton,
  handleDisputeButton,
  handleDisputeNeedInfoModalSubmit,
  handleDuplicateButton,
  NEEDINFO_MODAL_ID,
  REJECT_MODAL_ID,
  DISPUTE_NEEDINFO_MODAL_ID,
} from "@/bot/services/reviewFlow";
import { getStats } from "@/bot/services/statsService";
import { buildStatsEmbed } from "@/bot/services/embeds";
import { handleAutoExtractButton, handleAutoExtractEditModalSubmit } from "@/bot/services/autoExtractFlow";
import {
  handleCertSearchButton,
  handleCertSearchModalSubmit,
  CERT_SEARCH_MODAL_ID,
  handleCertApplyHereButton,
  handleCertReapplyHereButton,
  handleCertApplyHereModalSubmit,
  handleCertReapplyHereModalSubmit,
  CERT_APPLY_HERE_MODAL_ID,
  CERT_REAPPLY_HERE_MODAL_ID,
} from "@/bot/services/certPanelFlow";

const commandMap = new Map(commands.map((c) => [c.data.name, c]));

export function registerInteractionHandler(client: Client) {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const cmd = commandMap.get(interaction.commandName);
        if (!cmd) return;
        await cmd.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        const [ns, ...rest] = interaction.customId.split(":");

        if (ns === "panel") {
          const [kind] = rest;
          if (kind === "search") return void interaction.showModal(buildPanelSearchModal());
          if (kind === "report") return void interaction.showModal(buildReportModal());
          if (kind === "dispute") return void interaction.showModal(buildPanelDisputeModal());
          if (kind === "stats") {
            await interaction.deferReply({ flags: 64 });
            const stats = await getStats();
            await interaction.editReply({ embeds: [buildStatsEmbed(stats)] });
          }
          if (kind === "cert_search") return void (await handleCertSearchButton(interaction));
          if (kind === "cert_apply_here") return void (await handleCertApplyHereButton(interaction));
          if (kind === "cert_reapply_here") return void (await handleCertReapplyHereButton(interaction));
          return;
        }

        if (ns === "review") {
          const [caseId, action] = rest;
          await handleReviewButton(interaction, caseId, action);
          return;
        }
        if (ns === "case" && rest[0] === "view") {
          await handleCaseViewButton(interaction, rest[1]);
          return;
        }
        if (ns === "dispute") {
          const [disputeId, action] = rest;
          await handleDisputeButton(interaction, disputeId, action);
          return;
        }
        if (ns === "duplicate") {
          const [newCaseId, existingCaseId, action] = rest;
          await handleDuplicateButton(interaction, newCaseId, existingCaseId, action as "link" | "separate");
          return;
        }
        if (ns === "autoextract_exclude" || ns === "autoextract_register" || ns === "autoextract_edit") {
          await handleAutoExtractButton(interaction, ns, rest[0]);
          return;
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        const customId = interaction.customId;
        if (customId === REPORT_MODAL_ID) return void (await handleReportModalSubmit(interaction));
        if (customId === PANEL_SEARCH_MODAL_ID) return void (await handlePanelSearchModalSubmit(interaction));
        if (customId === PANEL_DISPUTE_MODAL_ID) return void (await handlePanelDisputeModalSubmit(interaction));
        if (customId.startsWith(`${DISPUTE_MODAL_ID}:`)) {
          const caseNumber = customId.split(":")[1];
          return void (await handleDisputeModalSubmit(interaction, caseNumber));
        }
        if (customId.startsWith(`${NEEDINFO_MODAL_ID}:`)) {
          const caseId = customId.split(":")[1];
          return void (await handleNeedInfoModalSubmit(interaction, caseId));
        }
        if (customId.startsWith(`${REJECT_MODAL_ID}:`)) {
          const caseId = customId.split(":")[1];
          return void (await handleRejectModalSubmit(interaction, caseId));
        }
        if (customId.startsWith(`${DISPUTE_NEEDINFO_MODAL_ID}:`)) {
          const disputeId = customId.split(":")[1];
          return void (await handleDisputeNeedInfoModalSubmit(interaction, disputeId));
        }
        if (customId.startsWith("autoextract_edit_modal:")) {
          const draftId = customId.split(":")[1];
          return void (await handleAutoExtractEditModalSubmit(interaction, draftId));
        }
        if (customId === CERT_SEARCH_MODAL_ID) return void (await handleCertSearchModalSubmit(interaction));
        if (customId === CERT_APPLY_HERE_MODAL_ID) return void (await handleCertApplyHereModalSubmit(interaction));
        if (customId === CERT_REAPPLY_HERE_MODAL_ID) return void (await handleCertReapplyHereModalSubmit(interaction));
      }
    } catch (err) {
      console.error("[interactionCreate] error", err);
      const reply = { content: "⚠️ 처리 중 오류가 발생했습니다.", flags: 64 as const };
      try {
        if (interaction.isRepliable()) {
          if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
          else await interaction.reply(reply);
        }
      } catch {
        // ignore secondary failure
      }
    }
  });
}

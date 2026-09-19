import { Events, type Client } from "discord.js";
import { botConfig } from "@/bot/config";
import { scanMessageForAutoExtract } from "@/bot/services/autoExtractFlow";
import { handlePotentialEvidenceMessage } from "@/bot/services/evidenceFlow";

export function registerMessageHandler(client: Client) {
  client.on(Events.MessageCreate, async (message) => {
    try {
      await handlePotentialEvidenceMessage(message);
    } catch (err) {
      console.error("[messageCreate] evidence handling failed", err);
    }

    if (!botConfig.reportChannelId || message.channelId !== botConfig.reportChannelId) return;
    try {
      await scanMessageForAutoExtract(message);
    } catch (err) {
      console.error("[messageCreate] auto-extract failed", err);
    }
  });
}

import { Events, type Client } from "discord.js";
import { botConfig } from "@/bot/config";
import { scanMessageForAutoExtract } from "@/bot/services/autoExtractFlow";

export function registerMessageHandler(client: Client) {
  client.on(Events.MessageCreate, async (message) => {
    if (!botConfig.reportChannelId) return;
    if (message.channelId !== botConfig.reportChannelId) return;
    try {
      await scanMessageForAutoExtract(message);
    } catch (err) {
      console.error("[messageCreate] auto-extract failed", err);
    }
  });
}

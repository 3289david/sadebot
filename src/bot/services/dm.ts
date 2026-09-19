import type { Client, EmbedBuilder } from "discord.js";

export async function safeSendDm(client: Client, userId: string, embed: EmbedBuilder) {
  try {
    const user = await client.users.fetch(userId);
    await user.send({ embeds: [embed] });
    return true;
  } catch {
    // DM이 막혀 있거나 사용자를 찾을 수 없는 경우 — 조용히 실패 처리
    return false;
  }
}

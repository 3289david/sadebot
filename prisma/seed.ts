import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerDiscordId = process.env.OWNER_DISCORD_ID;
  if (!ownerDiscordId) {
    console.log("[seed] OWNER_DISCORD_ID가 설정되지 않아 Owner 계정 생성을 건너뜁니다.");
    return;
  }

  const owner = await prisma.adminUser.upsert({
    where: { discordId: ownerDiscordId },
    create: { discordId: ownerDiscordId, role: "OWNER", active: true },
    update: { role: "OWNER", active: true },
  });

  console.log(`[seed] Owner 계정 준비 완료: discordId=${owner.discordId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

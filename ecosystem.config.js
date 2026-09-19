module.exports = {
  apps: [
    {
      name: "sadebot-web",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/root/sadebot",
      env: {
        NODE_ENV: "production",
        PORT: "3016",
      },
    },
    {
      name: "sadebot-bot",
      script: "node_modules/.bin/tsx",
      args: "src/bot/index.ts",
      cwd: "/root/sadebot",
      env: {
        NODE_ENV: "production",
      },
      // DISCORD_BOT_TOKEN이 아직 설정되지 않은 경우 src/bot/index.ts가 에러 없이
      // 바로 종료한다(정상 동작) — min_uptime/max_restarts로 그런 상황에서도
      // PM2가 무한 재시작 루프에 빠지지 않고 몇 번 시도 후 멈추도록 한다.
      min_uptime: "10s",
      max_restarts: 10,
    },
  ],
};

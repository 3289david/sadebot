import "server-only";

const API = "https://discord.com/api/v10";

export const WEB_LOGIN_ROLES = ["OWNER", "ADMIN", "MODERATOR"] as const;

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return v;
}

export function getOAuthRedirectUri() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3016";
  return `${base}/api/auth/discord/callback`;
}

export function buildDiscordAuthorizeUrl(state: string) {
  const clientId = requiredEnv("DISCORD_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOAuthRedirectUri(),
    response_type: "code",
    scope: "identify",
    state,
    prompt: "none",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
}

interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

export async function exchangeCodeForUser(code: string): Promise<DiscordUser> {
  const clientId = requiredEnv("DISCORD_CLIENT_ID");
  const clientSecret = requiredEnv("DISCORD_CLIENT_SECRET");

  const tokenRes = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: getOAuthRedirectUri(),
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Discord 토큰 교환 실패: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  const token = (await tokenRes.json()) as DiscordTokenResponse;

  const userRes = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `${token.token_type} ${token.access_token}` },
  });
  if (!userRes.ok) {
    throw new Error(`Discord 사용자 조회 실패: ${userRes.status}`);
  }
  return (await userRes.json()) as DiscordUser;
}

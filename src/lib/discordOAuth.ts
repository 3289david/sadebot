import "server-only";

const API = "https://discord.com/api/v10";

export const WEB_LOGIN_ROLES = ["OWNER", "ADMIN", "MODERATOR"] as const;

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return v;
}

function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3016";
}

// 리버스 프록시(nginx) 뒤에서는 Route Handler의 request.url이 내부 바인드 주소
// (예: http://localhost:3016/...)로 잡히는 경우가 있어, 리다이렉트 대상 URL은
// 절대 요청 origin을 기준으로 만들지 말고 항상 이 함수로 공개 도메인 기준으로 생성한다.
export function publicUrl(path: string, searchParams?: Record<string, string>) {
  const u = new URL(path, baseUrl());
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) u.searchParams.set(k, v);
  }
  return u;
}

export function getOAuthRedirectUri() {
  return `${baseUrl()}/api/auth/discord/callback`;
}

export function getUserOAuthRedirectUri() {
  return `${baseUrl()}/api/auth/discord-user/callback`;
}

export function buildDiscordAuthorizeUrl(state: string, redirectUri: string = getOAuthRedirectUri(), scope = "identify") {
  const clientId = requiredEnv("DISCORD_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
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

export async function exchangeCodeForUser(
  code: string,
  redirectUri: string = getOAuthRedirectUri(),
): Promise<DiscordUser & { accessToken: string }> {
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
      redirect_uri: redirectUri,
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
  const user = (await userRes.json()) as DiscordUser;
  return { ...user, accessToken: token.access_token };
}

export interface DiscordUserGuild {
  id: string;
  name: string;
  owner: boolean;
  permissions: string;
}

const MANAGE_GUILD_BIT = BigInt(0x20);

export async function fetchManageableGuilds(accessToken: string): Promise<DiscordUserGuild[]> {
  const res = await fetch(`${API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const guilds = (await res.json()) as DiscordUserGuild[];
  return guilds.filter((g) => g.owner || (BigInt(g.permissions) & MANAGE_GUILD_BIT) !== BigInt(0));
}

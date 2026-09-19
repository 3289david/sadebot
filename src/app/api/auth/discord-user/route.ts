import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { buildDiscordAuthorizeUrl, getUserOAuthRedirectUri } from "@/lib/discordOAuth";
import { USER_OAUTH_STATE_COOKIE, USER_OAUTH_RETURN_COOKIE } from "@/lib/authConstants";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/report";
  // 서버 목록이 필요한 흐름(예: 웹에서 인증 신청)만 guilds 스코프를 추가로 요청한다.
  const scope = url.searchParams.get("scope") === "guilds" ? "identify guilds" : "identify";

  const state = randomUUID();
  const c = await cookies();
  c.set(USER_OAUTH_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 300 });
  c.set(USER_OAUTH_RETURN_COOKIE, returnTo, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 300 });

  return NextResponse.redirect(buildDiscordAuthorizeUrl(state, getUserOAuthRedirectUri(), scope));
}

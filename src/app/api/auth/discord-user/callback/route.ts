import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForUser, getUserOAuthRedirectUri, publicUrl } from "@/lib/discordOAuth";
import { USER_OAUTH_STATE_COOKIE, USER_OAUTH_RETURN_COOKIE } from "@/lib/authConstants";
import { createUserSession } from "@/lib/userSession";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const c = await cookies();
  const savedState = c.get(USER_OAUTH_STATE_COOKIE)?.value;
  const returnTo = c.get(USER_OAUTH_RETURN_COOKIE)?.value ?? "/report";
  c.delete(USER_OAUTH_STATE_COOKIE);
  c.delete(USER_OAUTH_RETURN_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(publicUrl(returnTo, { error: "invalid_state" }));
  }

  try {
    const discordUser = await exchangeCodeForUser(code, getUserOAuthRedirectUri());
    await createUserSession(discordUser.id, discordUser.global_name ?? discordUser.username, discordUser.accessToken);
  } catch (err) {
    console.error("[user-oauth-callback] failed", err);
    return NextResponse.redirect(publicUrl(returnTo, { error: "oauth_failed" }));
  }

  return NextResponse.redirect(publicUrl(returnTo));
}

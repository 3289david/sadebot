import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { buildDiscordAuthorizeUrl } from "@/lib/discordOAuth";
import { OAUTH_STATE_COOKIE } from "@/lib/authConstants";

export async function GET() {
  const state = randomUUID();
  const c = await cookies();
  c.set(OAUTH_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 300 });
  return NextResponse.redirect(buildDiscordAuthorizeUrl(state));
}

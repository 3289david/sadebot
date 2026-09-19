import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// 일반 제보자/서버 신청자용 세션 — 관리자 세션(AdminUser 화이트리스트)과 달리 아무 Discord 계정이나
// 로그인할 수 있다. identify 스코프만 쓰면 웹 제보를 실제 Discord 계정에 귀속시키는 용도,
// identify+guilds 스코프를 쓰면 "내가 관리하는 서버 목록"을 불러와 웹에서 인증 신청까지 할 수 있다.
const USER_COOKIE = "sadebot_user_session";
const SESSION_DAYS = 7;

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function createUserSession(discordId: string, username: string, accessToken?: string) {
  const token = await new SignJWT({ discordId, username, accessToken })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const c = await cookies();
  c.set(USER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function getCurrentReporter(): Promise<{ discordId: string; username: string; accessToken?: string } | null> {
  const c = await cookies();
  const token = c.get(USER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.discordId || !payload.username) return null;
    return {
      discordId: String(payload.discordId),
      username: String(payload.username),
      accessToken: payload.accessToken ? String(payload.accessToken) : undefined,
    };
  } catch {
    return null;
  }
}

export async function destroyUserSession() {
  const c = await cookies();
  c.delete(USER_COOKIE);
}

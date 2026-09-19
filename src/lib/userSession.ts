import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// 일반 제보자용 세션 — 관리자 세션(AdminUser 화이트리스트)과 달리 아무 Discord 계정이나
// 로그인할 수 있다. 목적은 딱 하나: 웹 제보를 익명이 아닌 실제 Discord 계정에 귀속시키는 것.
const USER_COOKIE = "sadebot_user_session";
const SESSION_DAYS = 7;

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function createUserSession(discordId: string, username: string) {
  const token = await new SignJWT({ discordId, username })
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

export async function getCurrentReporter(): Promise<{ discordId: string; username: string } | null> {
  const c = await cookies();
  const token = c.get(USER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.discordId || !payload.username) return null;
    return { discordId: String(payload.discordId), username: String(payload.username) };
  } catch {
    return null;
  }
}

export async function destroyUserSession() {
  const c = await cookies();
  c.delete(USER_COOKIE);
}

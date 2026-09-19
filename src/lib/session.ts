import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const ADMIN_COOKIE = "sadebot_admin_session";
const ADMIN_SESSION_HOURS = 12;

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(adminId: string, ip?: string, userAgent?: string) {
  const jti = randomUUID();
  const token = await new SignJWT({ sub: adminId, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_HOURS}h`)
    .sign(secretKey());

  const expiresAt = new Date(Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000);
  await prisma.adminSession.create({
    data: { adminId, tokenHash: hashToken(jti), ip, userAgent, expiresAt },
  });

  const c = await cookies();
  c.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 60 * 60,
  });
}

export async function getCurrentAdmin() {
  const c = await cookies();
  const token = c.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const jti = payload.jti as string | undefined;
    const adminId = payload.sub as string | undefined;
    if (!jti || !adminId) return null;

    const session = await prisma.adminSession.findUnique({ where: { tokenHash: hashToken(jti) } });
    if (!session || session.expiresAt < new Date()) return null;

    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin || !admin.active) return null;
    return admin;
  } catch {
    return null;
  }
}

export async function destroyAdminSession() {
  const c = await cookies();
  const token = c.get(ADMIN_COOKIE)?.value;
  c.delete(ADMIN_COOKIE);
  if (!token) return;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const jti = payload.jti as string | undefined;
    if (jti) {
      await prisma.adminSession.delete({ where: { tokenHash: hashToken(jti) } }).catch(() => {});
    }
  } catch {
    // ignore invalid token
  }
}

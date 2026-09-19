import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForUser, WEB_LOGIN_ROLES, publicUrl } from "@/lib/discordOAuth";
import { OAUTH_STATE_COOKIE } from "@/lib/authConstants";
import { createAdminSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const c = await cookies();
  const savedState = c.get(OAUTH_STATE_COOKIE)?.value;
  c.delete(OAUTH_STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(publicUrl("/admin/login", { error: "invalid_state" }));
  }

  let discordUser;
  try {
    discordUser = await exchangeCodeForUser(code);
  } catch (err) {
    console.error("[oauth-callback] exchange failed", err);
    return NextResponse.redirect(publicUrl("/admin/login", { error: "oauth_failed" }));
  }

  const admin = await prisma.adminUser.findUnique({ where: { discordId: discordUser.id } });
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const userAgent = h.get("user-agent") || "unknown";

  if (!admin || !admin.active || !WEB_LOGIN_ROLES.includes(admin.role as (typeof WEB_LOGIN_ROLES)[number])) {
    await logAudit({ action: "LOGIN_FAIL", detail: { discordId: discordUser.id, reason: !admin ? "not_registered" : "role_not_allowed" }, ip });
    return NextResponse.redirect(publicUrl("/admin/login", { error: "not_authorized" }));
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      displayName: discordUser.global_name ?? discordUser.username,
      avatarHash: discordUser.avatar,
      lastLoginAt: new Date(),
    },
  });

  await createAdminSession(admin.id, ip, userAgent);
  await logAudit({ actorId: admin.id, action: "LOGIN_SUCCESS", targetType: "AdminUser", targetId: admin.id, ip });

  return NextResponse.redirect(publicUrl("/admin"));
}

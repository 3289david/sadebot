"use server";

import { redirect } from "next/navigation";
import { destroyAdminSession, getCurrentAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function adminLogoutAction() {
  const admin = await getCurrentAdmin();
  if (admin) await logAudit({ actorId: admin.id, action: "LOGOUT" });
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

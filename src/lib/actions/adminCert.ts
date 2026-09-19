"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/adminAuth";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { recordTestResult, changeCertStatus, pickRandomTestPlan } from "@/lib/certService";
import type { CertStatus, CertTestResult, CertTestType } from "@prisma/client";

export async function recordTestResultAction(certId: string, testType: CertTestType, formData: FormData) {
  const admin = await requireAdmin();
  requirePermission(admin.role, "MANAGE_CERTIFICATION");

  const result = String(formData.get("result") ?? "NA") as CertTestResult;
  const note = String(formData.get("note") ?? "").trim() || undefined;
  await recordTestResult({ certId, testType, result, note, actorId: admin.id });
  revalidatePath(`/admin/certifications/${certId}`);
}

export async function rollTestPlanAction(certId: string) {
  const admin = await requireAdmin();
  requirePermission(admin.role, "MANAGE_CERTIFICATION");

  const plan = pickRandomTestPlan(3);
  await prisma.certEvent.create({ data: { certId, event: "TEST_PLAN_ROLLED", actorId: admin.id, detail: { plan } } });
  revalidatePath(`/admin/certifications/${certId}`);
  return plan;
}

export async function changeCertStatusAction(certId: string, newStatus: CertStatus, formData: FormData) {
  const admin = await requireAdmin();
  requirePermission(admin.role, "MANAGE_CERTIFICATION");

  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  await changeCertStatus({ certId, newStatus, actorId: admin.id, reason });
  revalidatePath(`/admin/certifications/${certId}`);
  revalidatePath("/admin/certifications");
}


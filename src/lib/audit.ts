import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// 감사 로그는 필요 최소 범위만 남긴다: 원본 IP 대신 해시만 보관.
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function logAudit(params: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Prisma.InputJsonValue;
  ip?: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      detail: params.detail,
      ipHash: params.ip ? hashIp(params.ip) : null,
    },
  });
}

export async function logCaseEvent(params: {
  caseId: string;
  event: string;
  actorId?: string | null;
  detail?: Prisma.InputJsonValue;
}) {
  await prisma.caseEvent.create({
    data: {
      caseId: params.caseId,
      event: params.event,
      actorId: params.actorId ?? null,
      detail: params.detail,
    },
  });
}

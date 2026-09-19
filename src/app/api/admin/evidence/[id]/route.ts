import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { getCurrentAdmin } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { resolveEvidencePath } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

// 증거 파일은 공개 URL이 아니라 관리자 세션 인증을 거친 이 라우트로만 접근 가능하다.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, "VIEW_EVIDENCE")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const evidence = await prisma.evidence.findUnique({ where: { id } });
  if (!evidence || evidence.deletedAt) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await logAudit({ actorId: admin.id, action: "EVIDENCE_DOWNLOAD", targetType: "Evidence", targetId: id });

  const buffer = await readFile(resolveEvidencePath(evidence.storagePath));
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": evidence.mimeType ?? "application/octet-stream",
      "content-disposition": `attachment; filename="${encodeURIComponent(evidence.fileName)}"`,
    },
  });
}

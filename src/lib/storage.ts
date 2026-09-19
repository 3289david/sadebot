import "server-only";
import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const EVIDENCE_ROOT = path.join(process.cwd(), "uploads", "evidence");

// 증거 파일은 공개 URL로 두지 않고, 관리자 세션 인증을 거친 라우트 핸들러
// (/api/admin/evidence/[id])를 통해서만 접근한다 (스펙 28번).
export async function saveEvidenceBuffer(
  buffer: Buffer,
  originalName: string,
): Promise<{ storagePath: string; fileHash: string; sizeBytes: number }> {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const ext = path.extname(originalName).slice(0, 10);
  const safeName = `${randomUUID()}${ext}`;
  const fullPath = path.join(EVIDENCE_ROOT, safeName);
  await writeFile(fullPath, buffer);
  return { storagePath: path.join("evidence", safeName), fileHash, sizeBytes: buffer.byteLength };
}

export function resolveEvidencePath(storagePath: string): string {
  const resolved = path.join(process.cwd(), "uploads", storagePath);
  const root = path.join(process.cwd(), "uploads");
  if (!resolved.startsWith(root)) throw new Error("잘못된 파일 경로");
  return resolved;
}

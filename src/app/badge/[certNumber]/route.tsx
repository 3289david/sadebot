import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const STATUS_VISUAL: Record<string, { label: string; bg: string; fg: string }> = {
  ACTIVE: { label: "🟢 VERIFIED", bg: "#0f5132", fg: "#d1fae5" },
  EXPIRED: { label: "🟡 EXPIRED", bg: "#7a5b00", fg: "#fef3c7" },
  REVOKED: { label: "🔴 REVOKED", bg: "#7f1d1d", fg: "#fee2e2" },
  SUSPENDED: { label: "⚫ SUSPENDED", bg: "#1f2937", fg: "#e5e7eb" },
  PENDING: { label: "🟡 심사 대기", bg: "#57534e", fg: "#f5f5f4" },
  INFO_CHECK: { label: "🟡 심사중", bg: "#57534e", fg: "#f5f5f4" },
  TESTING: { label: "🟡 심사중", bg: "#57534e", fg: "#f5f5f4" },
  REVIEW: { label: "🟠 최종 검토중", bg: "#78350f", fg: "#fef3c7" },
};

export async function GET(_req: Request, { params }: { params: Promise<{ certNumber: string }> }) {
  const { certNumber } = await params;
  const cert = await prisma.serverCertification.findUnique({ where: { certNumber } });

  const visual = cert ? STATUS_VISUAL[cert.status] ?? STATUS_VISUAL.PENDING : { label: "❓ 인증 없음", bg: "#374151", fg: "#e5e7eb" };
  const guildName = cert?.guildName ?? "알 수 없는 서버";

  return new ImageResponse(
    (
      <div
        style={{
          width: "600px",
          height: "200px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "28px 36px",
          background: visual.bg,
          color: visual.fg,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>🛡️ 안전서버 인증</div>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 800, marginBottom: 6 }}>{guildName}</div>
        <div style={{ display: "flex", fontSize: 20, marginBottom: 14, opacity: 0.85 }}>Verified by SadeBot</div>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 700 }}>{visual.label}</div>
        <div style={{ display: "flex", fontSize: 16, opacity: 0.7, marginTop: 6 }}>{cert ? `인증번호 ${cert.certNumber}` : `인증번호 ${certNumber}`}</div>
      </div>
    ),
    {
      width: 600,
      height: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

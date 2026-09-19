import Link from "next/link";
import { getCurrentReporter } from "@/lib/userSession";
import { fetchManageableGuilds } from "@/lib/discordOAuth";
import { prisma } from "@/lib/prisma";
import { CERT_STATUS_LABEL } from "@/lib/certService";
import { applyCertificationWebAction } from "@/lib/actions/certifyWeb";
import { botConfig } from "@/bot/config";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "로그인 요청이 만료되었거나 위조되었습니다. 다시 시도해주세요.",
  oauth_failed: "Discord 인증에 실패했습니다. 다시 시도해주세요.",
};

export default async function CertifyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const reporter = await getCurrentReporter();

  return (
    <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-zinc-400 hover:underline">
        ← 홈으로
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-2">🛡️ 내 서버 안전서버 인증 신청</h1>
      <p className="text-sm text-zinc-500 mb-6">
        운영팀이 서버 정보와 실제 거래 처리를 직접 확인하고 인증합니다. 디스코드에서{" "}
        <code>/안전서버인증신청</code> 명령어로도 신청할 수 있습니다.
      </p>

      {!reporter?.accessToken ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 text-center">
          <p className="text-sm text-zinc-600 mb-4">
            내가 관리하는 서버 목록을 불러오려면 Discord 로그인이 필요합니다 (서버 목록 조회 권한 포함).
          </p>
          {error && <p className="text-sm text-red-600 mb-4">{ERROR_MESSAGES[error] ?? "로그인에 실패했습니다."}</p>}
          <a
            href="/api/auth/discord-user?returnTo=/certify&scope=guilds"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#5865F2] text-white text-sm font-medium hover:bg-[#4752c4]"
          >
            Discord로 로그인
          </a>
        </div>
      ) : (
        <GuildList accessToken={reporter.accessToken} />
      )}
    </main>
  );
}

async function GuildList({ accessToken }: { accessToken: string }) {
  const guilds = (await fetchManageableGuilds(accessToken)).filter((g) => g.id !== botConfig.guildId);

  if (guilds.length === 0) {
    return <p className="text-sm text-zinc-500">서버 관리 권한을 가진 서버가 없습니다.</p>;
  }

  const certs = await prisma.serverCertification.findMany({
    where: { guildId: { in: guilds.map((g) => g.id) } },
  });
  const certByGuild = new Map(certs.map((c) => [c.guildId, c]));

  return (
    <div className="space-y-3">
      {guilds.map((g) => {
        const cert = certByGuild.get(g.id);
        return (
          <div key={g.id} className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl p-4">
            <div>
              <p className="font-medium">{g.name}</p>
              {cert ? (
                <p className="text-xs text-zinc-400">
                  {cert.certNumber} · {CERT_STATUS_LABEL[cert.status]}
                </p>
              ) : (
                <p className="text-xs text-zinc-400">아직 인증 신청 이력 없음</p>
              )}
            </div>
            {cert ? (
              <Link href={`/server/${cert.certNumber}`} className="text-sm text-indigo-600 underline shrink-0">
                인증 페이지 보기
              </Link>
            ) : (
              <form action={applyCertificationWebAction.bind(null, g.id, g.name)}>
                <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 shrink-0">
                  인증 신청
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}

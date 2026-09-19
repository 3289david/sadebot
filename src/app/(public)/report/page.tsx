import Link from "next/link";
import { getCurrentReporter } from "@/lib/userSession";
import { fetchAllGuilds } from "@/lib/discordOAuth";
import { botConfig } from "@/bot/config";
import ReportForm from "./ReportForm";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "로그인 요청이 만료되었거나 위조되었습니다. 다시 시도해주세요.",
  oauth_failed: "Discord 인증에 실패했습니다. 다시 시도해주세요.",
};

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const reporter = await getCurrentReporter();

  return (
    <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-zinc-400 hover:underline">
        ← 홈으로
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-2">🚨 사기 제보</h1>

      {!reporter ? (
        <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-6 text-center">
          <p className="text-sm text-zinc-600 mb-4">
            허위/악성 제보를 막기 위해 웹 제보는 Discord 로그인이 필요합니다.
            <br />
            제보 내용은 로그인한 Discord 계정에 연결되어 접수됩니다.
          </p>
          {error && <p className="text-sm text-red-600 mb-4">{ERROR_MESSAGES[error] ?? "로그인에 실패했습니다."}</p>}
          <a
            href="/api/auth/discord-user?returnTo=/report"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#5865F2] text-white text-sm font-medium hover:bg-[#4752c4]"
          >
            Discord로 로그인하고 제보하기
          </a>
        </div>
      ) : (
        <ReportForm
          username={reporter.username}
          guilds={
            reporter.accessToken
              ? (await fetchAllGuilds(reporter.accessToken)).filter((g) => g.id !== botConfig.guildId)
              : []
          }
        />
      )}
    </main>
  );
}

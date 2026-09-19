const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "로그인 요청이 만료되었거나 위조되었습니다. 다시 시도해주세요.",
  oauth_failed: "Discord 인증에 실패했습니다. 다시 시도해주세요.",
  not_authorized: "이 계정은 사데봇 웹 패널 접근 권한이 없습니다. (Owner/Admin/Manager만 접속 가능)",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 w-full max-w-sm text-center space-y-5">
        <h1 className="text-xl font-bold">🛡️ 사데봇 관리자</h1>
        <p className="text-sm text-neutral-500">Discord 계정으로 로그인하세요. Owner/Admin/Manager 권한이 있는 계정만 접속할 수 있습니다.</p>
        {error && <p className="text-sm text-red-600">{ERROR_MESSAGES[error] ?? "로그인에 실패했습니다."}</p>}
        <a
          href="/api/auth/discord"
          className="flex items-center justify-center gap-2 w-full bg-[#5865F2] text-white text-sm font-medium py-2.5 rounded-md hover:bg-[#4752c4]"
        >
          Discord로 로그인
        </a>
      </div>
    </div>
  );
}

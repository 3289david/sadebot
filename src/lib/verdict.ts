// 검색 결과를 "사건 목록"으로만 늘어놓지 않고, TheCheat(더치트)처럼 검색 결과 맨 위에
// "이 대상에게 사기 제보 이력이 있는지"를 한눈에 보여주기 위한 판정 로직.
// 원래 취지(사기 예방을 위한 검색 서비스)를 살리기 위한 것 — 사건 상세 목록은 그 아래에 계속 보여준다.
export type VerdictLevel = "danger" | "caution" | "reviewing" | "none";

export interface Verdict {
  level: VerdictLevel;
  title: string; // 짧은 한 줄 요약
  detail: string; // 부연 설명 (면책 문구 포함)
  caseCount: number;
  reportCount: number;
  color: number; // Discord embed color / 참고용
}

interface VerdictInputCase {
  status: string; // CaseStatus 값 (문자열로 넘어오는 호출부도 있어 느슨하게 받음)
  _count?: { reports: number };
}

export function computeVerdict(results: VerdictInputCase[]): Verdict {
  const caseCount = results.length;
  const reportCount = results.reduce((sum, r) => sum + (r._count?.reports ?? 0), 0);

  if (caseCount === 0) {
    return {
      level: "none",
      title: "🟢 등록된 사기 제보가 없습니다",
      detail: "※ 제보가 없다고 100% 안전하다는 뜻은 아닙니다. 거래 전 항상 주의하세요.",
      caseCount,
      reportCount,
      color: 0x57f287,
    };
  }

  const hasVerified = results.some((r) => r.status === "VERIFIED");
  const hasDisputed = results.some((r) => r.status === "DISPUTED");

  if (hasVerified) {
    return {
      level: "danger",
      title: `🔴 사기 제보 이력이 있는 대상입니다 (검증됨 ${results.filter((r) => r.status === "VERIFIED").length}건)`,
      detail: `관련 사건 ${caseCount}건 · 누적 제보 ${reportCount}건. 거래를 중단하고 아래 사건 내용을 확인하세요.`,
      caseCount,
      reportCount,
      color: 0xed4245,
    };
  }

  if (hasDisputed) {
    return {
      level: "caution",
      title: `🟠 이의제기 중인 제보가 있습니다`,
      detail: `관련 사건 ${caseCount}건 · 누적 제보 ${reportCount}건. 당사자 소명이 진행 중이니 신중히 판단하세요.`,
      caseCount,
      reportCount,
      color: 0xfaa61a,
    };
  }

  return {
    level: "reviewing",
    title: `🟡 검토 중인 제보가 있습니다`,
    detail: `관련 사건 ${caseCount}건 · 누적 제보 ${reportCount}건. 아직 운영진 검증 전이니 참고용으로만 확인하세요.`,
    caseCount,
    reportCount,
    color: 0xfaa61a,
  };
}

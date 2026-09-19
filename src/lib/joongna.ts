// 검색어를 중고나라 사기조회 서비스(web.joongna.com/fraud)로 넘겨주기 위한 URL 빌더.
// 검색어의 형태(이메일/전화번호/계좌번호/카카오 ID)를 추정해 type 파라미터를 결정하고,
// 넷 중 어느 것에도 해당하지 않으면 경찰청 사이버범죄 신고·예방 페이지로 대신 연결한다.
type JoongnaFraudType = "email" | "phone_number" | "account_number" | "kakao_id";

const POLICE_CYBER_URL = "https://www.police.go.kr/www/security/cyber/cyber04.jsp";

function classifyJoongnaType(value: string): { type: JoongnaFraudType; normalized: string } | null {
  const trimmed = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { type: "email", normalized: trimmed };
  }
  const digitsOnly = trimmed.replace(/[-\s]/g, "");
  if (/^01[016789][0-9]{6,8}$/.test(digitsOnly)) {
    return { type: "phone_number", normalized: digitsOnly };
  }
  if (/^[0-9]{8,16}$/.test(digitsOnly)) {
    return { type: "account_number", normalized: digitsOnly };
  }
  if (/^(?=.*[a-zA-Z])[a-zA-Z0-9_.-]{3,20}$/.test(trimmed)) {
    return { type: "kakao_id", normalized: trimmed };
  }
  return null;
}

export function buildJoongnaFraudUrl(query: string): string {
  const classified = classifyJoongnaType(query);
  if (!classified) return POLICE_CYBER_URL;
  const { type, normalized } = classified;
  return `https://web.joongna.com/fraud/result?inputValue=${encodeURIComponent(normalized)}&type=${type}`;
}

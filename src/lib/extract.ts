// 제보 원문 텍스트에서 정규식 기반으로 후보 정보를 추출한다.
// 주의: 이 결과는 "자동 추출 후보"일 뿐이며, 운영진 확인(admin review) 전에는
// 공개 DB에 절대 그대로 게시하지 않는다. (호출부에서 항상 pending 상태로만 저장할 것)

export interface ExtractedIdentifier {
  type:
    | "DISCORD_ID"
    | "DISCORD_INVITE"
    | "PHONE"
    | "BANK_NAME"
    | "BANK_ACCOUNT"
    | "ACCOUNT_HOLDER"
    | "EMAIL"
    | "WALLET_ADDRESS"
    | "WEBSITE";
  value: string;
}

const BANK_NAMES = [
  "국민은행", "KB국민", "신한은행", "우리은행", "하나은행", "농협", "NH농협",
  "기업은행", "IBK기업", "카카오뱅크", "토스뱅크", "새마을금고", "우체국",
  "SC제일은행", "씨티은행", "부산은행", "대구은행", "경남은행", "광주은행",
  "전북은행", "제주은행", "수협", "신협",
];

const AMOUNT_KEYWORDS = /(피해\s*금액|입금|송금|보냈|보낸|피해액)[^\n]{0,20}?([\d,]+(?:\.\d+)?)\s*(만원|원)/;
const PLAIN_AMOUNT = /([\d,]+(?:\.\d+)?)\s*(만원|원)/g;

export function extractIdentifiers(text: string): ExtractedIdentifier[] {
  const found: ExtractedIdentifier[] = [];
  const seen = new Set<string>();
  const push = (type: ExtractedIdentifier["type"], value: string) => {
    const key = `${type}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ type, value });
  };

  // 디스코드 초대 링크
  for (const m of text.matchAll(/discord(?:\.gg|\.com\/invite)\/([a-zA-Z0-9-]+)/g)) {
    push("DISCORD_INVITE", m[0]);
  }

  // 이메일
  for (const m of text.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)) {
    push("EMAIL", m[0]);
  }

  // 전화번호 (010-1234-5678 / 01012345678 / 010 1234 5678)
  for (const m of text.matchAll(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g)) {
    push("PHONE", m[0].replace(/[.\s]/g, "-"));
  }

  // 이더리움류 지갑 주소
  for (const m of text.matchAll(/\b0x[a-fA-F0-9]{40}\b/g)) {
    push("WALLET_ADDRESS", m[0]);
  }
  // 비트코인류 지갑 주소 (대략적인 패턴)
  for (const m of text.matchAll(/\b(bc1[a-z0-9]{20,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g)) {
    push("WALLET_ADDRESS", m[0]);
  }

  // 은행명 + 계좌번호 + (선택) 예금주 — "국민은행 12345678901234 홍길동" 패턴
  for (const bank of BANK_NAMES) {
    const re = new RegExp(
      `${bank}\\S*\\s*(?:계좌)?\\s*[:\\-]?\\s*([\\d][\\d-\\s]{7,20}[\\d])(?:\\s*([가-힣]{2,4})\\s*(?:계좌|명의|님)?)?`,
      "g",
    );
    for (const m of text.matchAll(re)) {
      push("BANK_NAME", bank);
      push("BANK_ACCOUNT", m[1].replace(/[-\s]/g, ""));
      if (m[2]) push("ACCOUNT_HOLDER", m[2]);
    }
  }

  // 예금주/이름 키워드 기반 (은행명 매칭에서 못 찾은 경우 보강)
  for (const m of text.matchAll(/(?:예금주|계좌\s*명의|이름)\s*[:\s]\s*([가-힣]{2,4})/g)) {
    push("ACCOUNT_HOLDER", m[1]);
  }

  // 디스코드 ID (스노우플레이크, 17~20자리 숫자) — 계좌번호와 겹치지 않도록 뒤에서 처리
  const accountValues = new Set(found.filter((f) => f.type === "BANK_ACCOUNT").map((f) => f.value));
  for (const m of text.matchAll(/\b\d{17,20}\b/g)) {
    if (accountValues.has(m[0])) continue;
    push("DISCORD_ID", m[0]);
  }

  // 웹사이트 URL (디스코드/이메일 제외)
  for (const m of text.matchAll(/https?:\/\/[^\s]+/g)) {
    if (m[0].includes("discord")) continue;
    push("WEBSITE", m[0]);
  }

  return found;
}

export function extractDamageAmount(text: string): number | null {
  const keyed = text.match(AMOUNT_KEYWORDS);
  const parseUnit = (numStr: string, unit: string) => {
    const n = Number(numStr.replace(/,/g, ""));
    if (Number.isNaN(n)) return null;
    return unit === "만원" ? n * 10000 : n;
  };
  if (keyed) {
    const val = parseUnit(keyed[2], keyed[3]);
    if (val !== null) return val;
  }
  const matches = [...text.matchAll(PLAIN_AMOUNT)];
  if (matches.length > 0) {
    const last = matches[matches.length - 1];
    return parseUnit(last[1], last[2]);
  }
  return null;
}

const DAMAGE_TYPE_KEYWORDS: Record<string, string[]> = {
  "거래 미이행": ["거래 미이행", "거래를 안", "약속을 안"],
  "입금 후 잠적": ["잠적", "먹튀", "입금하고 잠수", "받고 잠수"],
  "상품 미배송": ["미배송", "물건을 안 보내", "배송이 안"],
  "계정 거래": ["계정 거래", "계정판매", "계정 사기"],
  "게임 아이템": ["아이템", "게임 재화"],
  "대리 거래": ["대리 거래", "대리구매"],
};

export function guessDamageType(text: string): string | null {
  for (const [type, keywords] of Object.entries(DAMAGE_TYPE_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) return type;
  }
  return null;
}

export function normalizeIdentifierValue(type: string, value: string): string {
  if (type === "PHONE" || type === "BANK_ACCOUNT" || type === "DISCORD_ID") {
    return value.replace(/[^0-9]/g, "");
  }
  return value.trim().toLowerCase();
}

// 제보 원문 텍스트에서 후보 정보를 추출한다. 두 가지 방식을 함께 쓴다.
//  1) 라벨 기반 — "디스코드ID: 123..." 처럼 한 줄에 하나씩 적은 경우 (더 정확, 우선 적용)
//  2) 정규식 기반 — 자유 서술형 문장에서 패턴을 찾아 보강
// 주의: 이 결과는 "자동 추출 후보"일 뿐이며, 운영진 확인(admin review) 전에는
// 공개 DB에 절대 그대로 게시하지 않는다. (호출부에서 항상 pending 상태로만 저장할 것)

import type { IdentifierType } from "@prisma/client";

export interface ExtractedIdentifier {
  type: IdentifierType;
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

// "라벨: 값" 한 줄 입력용 라벨 → IdentifierType 매핑. 공백/괄호 없이 비교한다.
export const LABEL_MAP: Record<string, IdentifierType> = {
  "디스코드id": "DISCORD_ID",
  "디스코드아이디": "DISCORD_ID",
  "디코id": "DISCORD_ID",
  "디코아이디": "DISCORD_ID",
  "discordid": "DISCORD_ID",
  "디스코드사용자명": "DISCORD_USERNAME",
  "디스코드닉네임": "DISCORD_USERNAME",
  "디코닉네임": "DISCORD_USERNAME",
  "디스코드서버": "DISCORD_SERVER",
  "서버id": "DISCORD_SERVER",
  "서버아이디": "DISCORD_SERVER",
  "초대링크": "DISCORD_INVITE",
  "서버초대링크": "DISCORD_INVITE",
  "전화번호": "PHONE",
  "연락처": "PHONE",
  "핸드폰": "PHONE",
  "휴대폰": "PHONE",
  "휴대폰번호": "PHONE",
  "은행": "BANK_NAME",
  "은행명": "BANK_NAME",
  "계좌번호": "BANK_ACCOUNT",
  "계좌": "BANK_ACCOUNT",
  "예금주": "ACCOUNT_HOLDER",
  "이름": "ACCOUNT_HOLDER",
  "성함": "ACCOUNT_HOLDER",
  "계좌명의": "ACCOUNT_HOLDER",
  "이메일": "EMAIL",
  "email": "EMAIL",
  "거래사이트": "TRADE_SITE",
  "거래플랫폼": "TRADE_SITE",
  "게임닉네임": "GAME_NICK",
  "게임아이디": "GAME_NICK",
  "판매자닉네임": "SELLER_NICK",
  "판매자아이디": "SELLER_NICK",
  "닉네임": "SELLER_NICK",
  "웹사이트": "WEBSITE",
  "사이트": "WEBSITE",
  "url": "WEBSITE",
  "지갑주소": "WALLET_ADDRESS",
  "지갑": "WALLET_ADDRESS",
  "플랫폼id": "PLATFORM_ID",
  "거래플랫폼id": "PLATFORM_ID",
  "사건번호": "CASE_REF",
  "관련사건번호": "CASE_REF",
};

export function normalizeLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s()[\]:：-]/g, "");
}

// 한 줄에 하나씩 "라벨: 값" 형태로 적은 경우를 파싱한다. (신고 폼에서 권장하는 입력 방식)
export function extractLabeledLines(text: string): ExtractedIdentifier[] {
  const found: ExtractedIdentifier[] = [];
  const seen = new Set<string>();
  const push = (type: IdentifierType, value: string) => {
    const v = value.trim();
    if (!v) return;
    const key = `${type}:${v}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ type, value: v });
  };

  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([가-힣a-zA-Z0-9\s()[\]]{1,20})[:：]\s*(.+?)\s*$/);
    if (!m) continue;
    const type = LABEL_MAP[normalizeLabel(m[1])];
    if (!type) continue;

    // "계좌번호: 국민은행 12345678901234" 처럼 은행명이 값에 섞여 있으면 분리한다.
    if (type === "BANK_ACCOUNT") {
      const bank = BANK_NAMES.find((b) => m[2].includes(b));
      if (bank) push("BANK_NAME", bank);
      const digitsOnly = m[2].replace(/[^0-9]/g, "");
      if (digitsOnly) {
        push("BANK_ACCOUNT", digitsOnly);
        continue;
      }
    }

    push(type, m[2]);
  }

  return found;
}

export function extractIdentifiers(text: string): ExtractedIdentifier[] {
  const found: ExtractedIdentifier[] = [];
  const seen = new Set<string>();
  const push = (type: IdentifierType, value: string) => {
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

// 라벨 기반 결과를 우선하고, 정규식 결과로 보강한다 (같은 타입이 라벨로 이미 잡혔으면 정규식 결과는 버림).
export function extractAll(text: string): ExtractedIdentifier[] {
  const labeled = extractLabeledLines(text);
  const labeledTypes = new Set(labeled.map((l) => l.type));
  const regexed = extractIdentifiers(text).filter((r) => !labeledTypes.has(r.type));
  return [...labeled, ...regexed];
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
  "디스코드 서버": ["디스코드 서버", "디코 서버", "서버에서 사기", "가짜 서버"],
  "디스코드 DM": ["디스코드 DM", "디스코드 dm", "디코 DM", "디코 dm", "디엠으로", "디엠 사기", "DM으로 사기", "dm으로 사기"],
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

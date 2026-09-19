// 공개 화면(디스코드 검색 결과, 공개 웹페이지)에 노출하기 전 개인정보를 마스킹하는 유틸.
// 관리자 대시보드의 "사건 상세(비공개)" 화면에서만 원본 값을 그대로 보여준다.

import type { IdentifierType } from "@prisma/client";

export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 11) {
    // 010-1234-5678 -> 010-****-5678
    return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-***-${digits.slice(6)}`;
  }
  // 형식을 알 수 없으면 앞 3자리, 뒤 4자리만 노출
  if (digits.length > 7) {
    return `${digits.slice(0, 3)}${"*".repeat(digits.length - 7)}${digits.slice(-4)}`;
  }
  return "*".repeat(digits.length);
}

export function maskAccount(account: string): string {
  const digits = account.replace(/[^0-9]/g, "");
  if (digits.length <= 6) return "*".repeat(digits.length);
  // 1234****5678 형태: 앞 4, 뒤 4 노출
  return `${digits.slice(0, 4)}${"*".repeat(digits.length - 8)}${digits.slice(-4)}`;
}

export function maskName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  if (trimmed.length === 2) return `${trimmed[0]}*`;
  // 홍길동 -> 홍*동 (첫/끝 글자만 노출)
  const middle = "*".repeat(trimmed.length - 2);
  return `${trimmed[0]}${middle}${trimmed[trimmed.length - 1]}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return maskGeneric(email);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

export function maskDiscordId(id: string): string {
  if (id.length <= 6) return "*".repeat(id.length);
  return `${id.slice(0, 4)}${"*".repeat(id.length - 6)}${id.slice(-2)}`;
}

export function maskWallet(addr: string): string {
  if (addr.length <= 10) return "*".repeat(addr.length);
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function maskGeneric(value: string): string {
  if (value.length <= 4) return "*".repeat(value.length);
  return `${value.slice(0, 2)}${"*".repeat(value.length - 4)}${value.slice(-2)}`;
}

const MASKERS: Partial<Record<IdentifierType, (v: string) => string>> = {
  PHONE: maskPhone,
  BANK_ACCOUNT: maskAccount,
  ACCOUNT_HOLDER: maskName,
  EMAIL: maskEmail,
  DISCORD_ID: maskDiscordId,
  WALLET_ADDRESS: maskWallet,
};

export function maskByType(type: IdentifierType, value: string): string {
  const fn = MASKERS[type];
  return fn ? fn(value) : maskGeneric(value);
}

// 사건번호는 그 자체로 개인정보가 아니므로 마스킹하지 않는다.
export function maskCaseSummary<T extends { value: string; type: IdentifierType }>(
  identifiers: T[],
): (T & { valueMasked: string })[] {
  return identifiers.map((i) => ({ ...i, valueMasked: maskByType(i.type, i.value) }));
}

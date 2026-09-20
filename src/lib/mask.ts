// 공개 화면(디스코드 검색 결과, 공개 웹페이지, 공개 피드 채널)에 노출하기 전 개인정보를 마스킹하는 유틸.
// 운영자 결정: 전화번호/계좌번호만 마스킹하고, 나머지 항목(예금주 실명/디스코드ID/닉네임/이메일/
// 지갑주소/플랫폼ID 등)은 전체 공개한다. (법적 위험을 운영자가 인지한 상태에서 결정함)

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

const MASKERS: Partial<Record<IdentifierType, (v: string) => string>> = {
  PHONE: maskPhone,
  BANK_ACCOUNT: maskAccount,
};

export function maskByType(type: IdentifierType, value: string): string {
  const fn = MASKERS[type];
  return fn ? fn(value) : value;
}

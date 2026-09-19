import type { AdminRole } from "@prisma/client";

// 스펙 13번 항목의 역할 정의를 그대로 코드화한 권한 매트릭스.
export type Permission =
  | "REVIEW_REPORT" // 제보 검토
  | "APPROVE_REJECT" // 승인/반려
  | "EDIT_CASE" // DB 수정
  | "DELETE_CASE" // DB 삭제
  | "HIDE_CASE" // 임시 비공개
  | "VIEW_EVIDENCE" // 증거 확인
  | "RESOLVE_DISPUTE" // 이의제기 처리
  | "SANCTION_USER" // 사용자 제재
  | "VIEW_AUDIT_LOG" // 로그 확인
  | "MANAGE_ADMINS" // 운영진 권한 관리 (Owner 전용)
  | "MANAGE_CERTIFICATION"; // 안전서버 인증 심사/상태변경

const MATRIX: Record<AdminRole, Permission[]> = {
  OWNER: [
    "REVIEW_REPORT", "APPROVE_REJECT", "EDIT_CASE", "DELETE_CASE", "HIDE_CASE",
    "VIEW_EVIDENCE", "RESOLVE_DISPUTE", "SANCTION_USER", "VIEW_AUDIT_LOG", "MANAGE_ADMINS",
    "MANAGE_CERTIFICATION",
  ],
  ADMIN: [
    "REVIEW_REPORT", "APPROVE_REJECT", "EDIT_CASE", "DELETE_CASE", "HIDE_CASE",
    "VIEW_EVIDENCE", "RESOLVE_DISPUTE", "SANCTION_USER", "VIEW_AUDIT_LOG", "MANAGE_CERTIFICATION",
  ],
  MODERATOR: ["REVIEW_REPORT", "APPROVE_REJECT", "VIEW_EVIDENCE", "HIDE_CASE", "RESOLVE_DISPUTE", "MANAGE_CERTIFICATION"],
  REVIEWER: ["VIEW_EVIDENCE", "APPROVE_REJECT"],
  AUDITOR: ["VIEW_AUDIT_LOG", "VIEW_EVIDENCE"],
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function requirePermission(role: AdminRole, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error(`권한 없음: ${role} 역할은 ${permission} 권한이 없습니다.`);
  }
}

export const ROLE_LABEL: Record<AdminRole, string> = {
  OWNER: "오너 (Owner)",
  ADMIN: "어드민 (Admin)",
  MODERATOR: "매니저 (Manager)",
  REVIEWER: "리뷰어 (Reviewer)",
  AUDITOR: "감사자 (Auditor)",
};

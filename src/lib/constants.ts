export const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "🔵 접수",
  REVIEWING: "🟡 검토중",
  NEEDS_MORE_INFO: "🟠 추가자료 요청",
  VERIFIED: "🟢 검증완료",
  DISPUTED: "🔴 이의제기",
  ON_HOLD: "⚪ 보류",
  REJECTED: "⚫ 반려",
  EXPLAINED: "🟣 해명됨",
  DELETED: "🗑️ 삭제됨",
};

export const IDENTIFIER_LABEL: Record<string, string> = {
  DISCORD_ID: "Discord ID",
  DISCORD_USERNAME: "Discord 사용자명",
  DISCORD_SERVER: "Discord 서버",
  DISCORD_INVITE: "서버 초대 링크",
  PHONE: "전화번호",
  BANK_ACCOUNT: "계좌번호",
  BANK_NAME: "은행",
  ACCOUNT_HOLDER: "예금주",
  EMAIL: "이메일",
  TRADE_SITE: "거래 사이트",
  GAME_NICK: "게임 닉네임",
  SELLER_NICK: "판매자 닉네임",
  WEBSITE: "웹사이트",
  WALLET_ADDRESS: "지갑 주소",
  PLATFORM_ID: "거래 플랫폼 ID",
  CASE_REF: "제보 사건 번호",
};

export const EVIDENCE_LABEL: Record<string, string> = {
  CHAT_CAPTURE: "채팅 캡처",
  TRANSFER_RECORD: "송금 내역",
  TRADE_SCREEN: "거래 화면",
  EMAIL: "이메일",
  DM: "DM",
  VIDEO: "영상",
  CONTRACT: "계약/거래 내용",
  OTHER: "기타 파일",
};

export const DISPUTE_REASON_LABEL: Record<string, string> = {
  FACTUAL_ERROR: "사실과 다름",
  WRONG_PERSON: "잘못된 사람",
  TRADE_COMPLETED: "거래가 정상적으로 완료됨",
  ALREADY_REFUNDED: "이미 환불함",
  WRONG_INFO: "정보가 잘못 등록됨",
  DELETE_REQUEST: "개인정보 삭제 요청",
  OTHER: "기타",
};

export const DAMAGE_TYPES = [
  "거래 미이행",
  "입금 후 잠적",
  "상품 미배송",
  "계정 거래",
  "게임 아이템",
  "대리 거래",
  "기타",
];

export const EMBED_COLOR = {
  info: 0x5865f2,
  warn: 0xfaa61a,
  danger: 0xed4245,
  success: 0x57f287,
  neutral: 0x2b2d31,
};

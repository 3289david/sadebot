# 사데봇 (SadeBot)

디스코드 사기 제보 접수 · 검증 · 검색 플랫폼 (봇 + 웹 대시보드).

- 웹: https://discordfrauddb.krl.kr
- 서버 경로: `/root/sadebot`
- PM2: `sadebot-web` (포트 3016), `sadebot-bot`
- DB: PostgreSQL `sadebot` (로컬 5432)
- 상태: 봇/웹 모두 배포 완료, 실행 중

## 마지막으로 한 가지 남은 수동 설정

Discord Developer Portal → 해당 애플리케이션 → **OAuth2** 탭 → **Redirects** 에 아래 URL을
정확히 추가해야 웹 패널 로그인이 동작합니다 (등록 전까지는 `redirect_uri` 불일치로 로그인 실패):

```
https://discordfrauddb.krl.kr/api/auth/discord/callback
```

그 외 채워두면 좋은 값 (`.env`, 없어도 봇/웹은 동작하지만 기능이 제한됨):
- `DISCORD_GUILD_ID` — 슬래시 명령어를 특정 서버에 즉시 반영하고 싶을 때 (비워두면 전역 등록, 반영까지 최대 1시간. 현재 전역 등록됨)
- `DISCORD_LOG_CHANNEL_ID` — 신규 제보/등록/수정/삭제/이의제기 로그가 올라갈 채널
- `DISCORD_REPORT_CHANNEL_ID` — 자동 정보 인식(메시지 스캔)을 적용할 채널 (예: #사기제보)
- `DISCORD_LOG_WEBHOOK_URL` — 웹에서 발생한 이벤트도 같은 로그 채널에 남기고 싶을 때 (채널 설정 → 연동 → 웹후크 생성)

값 채운 뒤 반영:
```bash
cd /root/sadebot
pm2 restart sadebot-bot --update-env
```

봇을 새 서버에 초대하려면: Developer Portal → OAuth2 → URL Generator에서 scope `bot` + `applications.commands`,
권한은 Send Messages / Embed Links / Attach Files / Create Public Threads / Send Messages in Threads /
Manage Threads / Read Message History / Use Slash Commands 를 체크해 생성한 URL을 사용하세요.
**Bot 탭의 Privileged Gateway Intents에서 MESSAGE CONTENT INTENT가 켜져 있어야** 자동 정보 인식이 동작합니다.

## 로그인 / 권한 (Discord OAuth 전용)

웹 패널은 비밀번호가 없습니다. `/admin/login` → "Discord로 로그인" → Discord 계정으로 인증하면
서버가 `AdminUser` 테이블에서 해당 Discord 계정을 찾아 자동으로 세션을 발급합니다.
**사전에 `/admin/admins`(또는 디스코드 `/운영진설정 추가`)로 등록되지 않은 계정은 로그인해도 거부됩니다** —
임의의 Discord 사용자가 접근할 수 없습니다.

웹 패널 로그인이 허용되는 역할은 3단계뿐입니다 (역할별 권한은 `src/lib/rbac.ts`):

| 역할 | 웹 로그인 | 권한 |
|---|---|---|
| 오너 (Owner) | ✅ | 전체 권한 + 운영진 관리(`/admin/admins`) |
| 어드민 (Admin) | ✅ | 검토/승인/반려/수정/삭제/비공개/이의제기 처리/감사로그 열람 (운영진 관리 제외) |
| 매니저 (Manager/Moderator) | ✅ | 검토/승인/반려/임시비공개/이의제기 처리 (수정·삭제·감사로그 제외) |
| 리뷰어 (Reviewer) | ❌ (봇만) | 증거 확인 + 승인/반려 |
| 감사자 (Auditor) | ❌ (봇만) | 감사로그 열람 전용 |

최초 Owner는 `.env`의 `OWNER_DISCORD_ID`로 시드되어 있습니다 (`npm run seed`로 재적용 가능).
Owner는 `/admin/admins`에서 다른 Discord 계정을 어드민/매니저/리뷰어/감사자로 추가·역할변경·제거할 수 있고,
디스코드에서는 `/운영진설정 추가|제거|목록` 명령어로도 동일하게 관리됩니다 (같은 `AdminUser` 테이블 공유).

## 기능 요약

### 일반 사용자 (디스코드)
- `/신고` — 사기 제보 (모달 입력) → 접수 후 스레드에서 증거 파일 업로드
- `/검색`, `/사기꾼검색` — 전화번호/계좌/Discord ID/닉네임 등으로 검색 (결과는 마스킹)
- `/사건 사건번호:A10291` — 사건 상세 조회 (마스킹, 검토 이력이 있는 사건만)
- `/이의제기 사건번호:A10291` — 등록된 내용에 대한 소명
- `/통계` — 전체 통계

### 운영진 전용 (디스코드)
- `/사기꾼추가` — 검증된 정보 즉시 등록 (REVIEW_REPORT 권한 이상)
- `/패널설치 종류:검색|제보|이의제기|통계|안내|전체` — 현재 채널에 사용자용 패널 임베드 설치
  (채널마다 원하는 패널만 골라 설치 가능 — 여러 채널에 여러 임베드 구성 가능)
- `/운영진설정 추가|제거|목록` — Owner 전용, 운영진 권한 관리
- 신규 제보/자동 인식 로그에 달리는 버튼: 상세보기 / 승인 / 추가자료 요청 / 보류 / 반려
- 이의제기 로그에 달리는 버튼: 유지 / 임시 비공개 / 추가자료 요청 / 삭제
- 지정 채널(`DISCORD_REPORT_CHANNEL_ID`)에 올라오는 메시지는 자동으로 스캔되어
  전화번호/계좌/은행명/예금주/이메일/지갑주소/Discord ID 등을 추출하고 [수정]/[제외]/[등록] 버튼과 함께 표시

### 웹 (https://discordfrauddb.krl.kr)
- `/`, `/search`, `/case/[사건번호]`, `/report` — 공개 검색/제보 (모두 마스킹, 로그인 불필요)
- `/admin/login` — Discord OAuth 로그인
- `/admin` — 대기 제보/이의제기/추가자료요청 현황, 최근 등록
- `/admin/cases`, `/admin/cases/[id]` — 사건 목록/상세 (원본 비마스킹, 승인/보류/반려/추가자료요청/수정/비공개/삭제, 증거 다운로드, 중복 사건 연결)
- `/admin/disputes` — 이의제기 처리
- `/admin/audit` — 감사 로그
- `/admin/stats` — 통계
- `/admin/admins` — 운영진 권한 관리 (Owner 전용)

## 개인정보 보호 설계 (의도적으로 넣은 안전장치)

- **자동 추출 → 즉시 공개 아님**: 정규식으로 뽑아낸 정보는 항상 "검토 대기(RECEIVED)" 사건으로만 생성되고,
  운영진이 승인(`VERIFIED`)하기 전에는 공개 검색 대상에서 제외됩니다.
- **공개 검색은 상태 필터링**: `RECEIVED`(운영진 미검토) · `REJECTED` · `DELETED` 상태의 사건은
  일반 사용자 검색/사건 상세에 절대 노출되지 않습니다 (`src/bot/services/caseService.ts`의 `PUBLIC_SEARCHABLE_STATUSES`).
- **마스킹은 렌더링 시점에 단일 지점에서 처리**: `src/lib/mask.ts`. 원본 값은 관리자 세션에서만 조회 가능.
- **증거 파일은 공개 URL이 아님**: `/api/admin/evidence/[id]` 라우트가 관리자 세션 + `VIEW_EVIDENCE` 권한을 확인한 뒤에만 스트리밍.
- **감사 로그의 IP는 해시만 저장** (`src/lib/audit.ts`), 원본 IP는 남기지 않음.
- **동일인 자동 확정 금지**: 식별자 하나가 일치해도 `DuplicateLink`를 `PENDING`으로 만들 뿐, 운영진이
  [연결]/[별도 유지]를 눌러야 확정됩니다.
- **이의제기 상시 가능**: 등록된 당사자는 `/이의제기` 로 언제든 소명 가능하고, 처리 결과는 DM으로 통지됩니다.
- **Rate limit**: 제보는 디스코드ID(또는 웹은 IP 기반 가명 식별자) 당 10분에 5건으로 제한 (`src/lib/ratelimit.ts`).
- **웹 로그인은 화이트리스트 전용**: 사전에 운영진으로 등록된 Discord 계정만 OAuth 로그인이 통과됩니다.

완화하려면 위 파일들만 수정하면 되지만, 완화 시 명예훼손·개인정보보호법 리스크가 커진다는 점을 감안하세요.

## 개발 명령어

```bash
npm run dev           # 웹 개발 서버
npm run bot:dev        # 봇 개발 모드 (파일 변경 감지)
npm run bot:deploy     # 슬래시 명령어 등록
npm run seed           # Owner 계정 시드 (.env의 OWNER_DISCORD_ID 사용)
npx prisma studio      # DB GUI
npx prisma migrate dev --name <설명>   # 스키마 변경 시
```

## 로컬에서 새로 세팅하는 경우

```bash
git clone <repo>
cd sadebot
npm install --legacy-peer-deps   # npm arborist 버그 회피용, discord.js/prisma 설치 시 필요
cp .env.example .env             # 값 채우기
npx prisma migrate deploy
npm run seed
npm run build
pm2 start ecosystem.config.js
npm run bot:deploy
```

## 배포 (변경 반영)

```bash
cd /root/sadebot
git pull
npm ci --legacy-peer-deps
npx prisma migrate deploy
npm run build
pm2 reload ecosystem.config.js --update-env
```

## 알려진 한계 / 다음 단계 후보

- 이미지 안의 텍스트(OCR)는 인식하지 않습니다. 지금은 메시지 "본문 텍스트"만 정규식으로 분석합니다.
  OCR이 필요하면 Evidence 업로드 시 Vision API 연동을 추가하면 됩니다.
- 관계 그래프는 사건 상세 페이지의 목록형 뷰(`DuplicateLink`)로만 제공됩니다. 노드-그래프 시각화이 필요하면
  웹에 D3 등을 붙여 `/admin/cases/[id]`의 데이터를 그래프로 렌더링하면 됩니다.
- 악성 신고 방지는 rate limit 수준입니다. 계정 생성일/서버 가입 기간 기반 신뢰도 스코어링은 아직 없습니다.
- 증거 파일은 로컬 디스크(`/root/sadebot/uploads/evidence`)에 저장됩니다. 트래픽이 커지면 R2/S3 +
  서명 URL 방식으로 옮기는 것을 권장합니다.

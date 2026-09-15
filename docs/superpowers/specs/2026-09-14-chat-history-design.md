# 해뜸 여행 도우미 챗봇 히스토리 설계

**상태:** 방향 확정 · 미구현
**작성일:** 2026-09-14
**저장소:** PostgreSQL + Prisma
**API:** NestJS REST `/api/v1`

## 1. 목표

챗봇 화면(`/chat`) 헤더 우측에 시계 아이콘을 추가하고, 클릭 시 오른쪽에서 왼쪽으로
슬라이드되는 패널에 과거 대화 목록을 보여준다. 목록에서 대화를 선택하면 해당 대화를
이어서 계속할 수 있어야 한다.

지금 챗봇은 완전히 stateless다 — 클라이언트가 매 요청마다 전체 대화를 보내고, 서버는
응답만 생성할 뿐 어떤 대화도 DB에 남기지 않는다. 이번 작업은 대화를 실제로 저장하고,
여러 개의 독립된 대화(스레드)를 목록으로 조회·재개할 수 있게 만드는 저장 계층을 새로
추가한다.

## 2. 확인된 현재 상태

- 프론트: `messages` 배열은 `apps/web/src/app/chat/page.tsx`의 `useState`로만
  존재하고 새로고침 시 사라진다.
- 백엔드: `POST /chat/messages/stream`(`chat.controller.ts:29`)과
  `POST /chat/messages`(`chat.controller.ts:108`)는 응답을 스트리밍/생성만 하고
  대화 내용을 저장하지 않는다.
- `ChatRequestSchema`(`packages/contracts/src/chat.ts:17`)는 `conversationId`
  개념이 없고, 클라이언트가 매번 전체 `messages` 배열을 보낸다(완전 stateless).
- `ChatQuotaService`(`apps/api/src/chat/chat-quota.service.ts`)는 `requestId`
  기반 idempotency와 일일 10회 호출 제한을 `chat_requests`/`chat_daily_usage`
  테이블로 관리하지만, 이는 재시도 방지·과금용이지 대화 로그가 아니다.
- 로그인은 필수이며 세션 쿠키 기반 인증이 이미 있다. 조회 전용 엔드포인트는
  `SessionAuthGuard` + `@CurrentUser()`(`apps/api/src/place-favorites/place-favorites.controller.ts:28`
  등에서 사용 중)를 그대로 재사용할 수 있다.
- 오른쪽에서 슬라이드되는 패널 컴포넌트는 없지만, 아래에서 올라오는 바텀시트 형태의
  `@base-ui/react/dialog` 패턴이
  `apps/web/src/components/travel/place-search-dialog.tsx:74`에 이미 있다.
- offset 기반 cursor+nextCursor 페이지네이션 선례가
  `apps/api/src/place-reels/place-reels.service.ts:168`에 있다.

## 3. 범위

### 이번 구현에 포함

- 로그인한 사용자별 대화(스레드) 저장: `ChatConversation` + `ChatMessage` 테이블
- 대화별 메시지가 실제로 완료된 시점에만 저장(요청 재시도로 중복 저장되지 않음)
- 헤더 시계 아이콘 → 오른쪽에서 슬라이드되는 히스토리 패널
- 히스토리 목록 조회(cursor 페이지네이션), 대화 클릭 시 메시지를 불러와 이어서 대화
- 스트리밍/비스트리밍 두 엔드포인트 모두 `conversationId`를 응답에 포함

### 이번 구현에서 제외

- 대화 삭제, 이름변경(제목 수정)
- "새 대화 시작" 버튼(페이지를 벗어났다 재진입하면 항상 새 대화로 시작하는 기존
  동작으로 충분하다고 판단)
- 히스토리 검색, 즐겨찾기 등 부가 기능
- 여러 기기 간 실시간 동기화(폴링/웹소켓)

## 4. 승인된 사용자 흐름

```text
/chat (새로 진입 시 항상 새 대화 화면)
  └─ 헤더 우측 시계 아이콘
       └─ 히스토리 패널 (오른쪽 → 왼쪽 슬라이드)
            ├─ 과거 대화 목록 (제목, 마지막 갱신 시각, 최근 메시지 미리보기)
            ├─ "더 보기" (cursor 기반)
            └─ 대화 클릭
                 ├─ 해당 대화 메시지 전체 로드 → 현재 화면에 표시
                 ├─ 패널 닫힘
                 └─ 이어서 메시지 전송 가능 (같은 conversationId로 계속 저장)
```

## 5. 데이터 모델

### ChatConversation

| 필드 | 타입/규칙 | 설명 |
|---|---|---|
| `id` | UUID PK | 대화 식별자 |
| `userId` | UUID FK | 대화 소유자 |
| `title` | `String(80)` | 첫 사용자 메시지에서 자동 생성 |
| `createdAt` | timestamptz | 생성 시각 |
| `updatedAt` | timestamptz | 마지막 메시지 저장 시각 |

```text
INDEX(userId, updatedAt)
ChatConversation N ─ 1 User (onDelete: Cascade)
ChatConversation 1 ─ N ChatMessage
```

### ChatMessage

| 필드 | 타입/규칙 | 설명 |
|---|---|---|
| `id` | UUID PK | 메시지 식별자 |
| `conversationId` | UUID FK | 소속 대화 |
| `role` | `String(20)` | `user` \| `assistant` |
| `content` | Text | 메시지 본문 |
| `createdAt` | timestamptz | 저장 시각 |

```text
INDEX(conversationId, createdAt)
ChatMessage N ─ 1 ChatConversation (onDelete: Cascade)
```

### ChatRequestUsage(기존 `chat_requests` 테이블에 컬럼 추가)

`conversation_id UUID` 컬럼을 추가한다. 대화 해석(신규 생성/기존 재사용)을 요청
예약(`reserve`) 트랜잭션 안에서 함께 처리하고, 같은 결과를 idempotent 재시도에도
그대로 돌려주기 위함이다. `payloadHash`는 기존과 동일하게 `messages`만으로
계산한다 — 스트리밍 중 `meta` 이벤트로 클라이언트의 `conversationId`가
바뀔 수 있어, 이를 해시에 포함시키면 부분 실패 후 재시도가 영구적으로
409에 걸리는 회귀가 생긴다(구현 중 발견되어 수정됨). 대화 소유권은
해시가 아니라 같은 트랜잭션 안의 `ChatConversationService.resolve`가
검증한다.

## 6. 대화 해석·저장 경계

`ChatConversationService`(신규, `apps/api/src/chat/chat-conversation.service.ts`)가
아래 책임을 갖는다.

```text
resolve(tx, userId, conversationId | undefined, firstUserMessage) → conversationId
  - conversationId가 있으면: 존재 + userId 소유 확인, 아니면 404
  - 없으면: title 생성 후 새 ChatConversation 생성

appendExchange(tx, conversationId, userContent, assistantReply) → void
  - user, assistant 메시지 각 1건 저장 + ChatConversation.updatedAt 갱신

listForUser(userId, { cursor, limit }) → { items, nextCursor }
  - updatedAt DESC, offset 기반 cursor (place-reels와 동일한 방식)
  - 각 item: id, title, updatedAt, 최근 메시지 미리보기(최신 메시지 1건)

getMessages(userId, conversationId) → ChatMessage[]
  - 소유권 확인 후 createdAt ASC 전체 반환, 없거나 소유자가 다르면 404
```

`ChatQuotaService.reserve()`(`chat-quota.service.ts:65`)는 기존 advisory-lock
트랜잭션 안에서 `resolve`를 호출해 `conversationId`를 얻고
`chat_requests.conversation_id`에 함께 저장한다. `ChatReservation` 타입에
`conversationId: string`을 추가한다.

`ChatAccessService.settle()`은 상태 전이가 실제로 일어난 경우(재시도가 아닌 최초
완료)에만 `appendExchange`를 호출한다. 기존 `quota.settle()`의
`WHERE status = 'RESERVED'` guard를 그대로 재사용해 재시도로 인한 메시지 중복
저장을 막는다.

## 7. 공유 HTTP 계약 (packages/contracts/src/chat.ts, chat-errors.ts)

### ChatRequestSchema (수정)

```json
{
  "requestId": "uuid (optional)",
  "conversationId": "uuid (optional, 없으면 새 대화)",
  "messages": [ { "role": "user", "content": "..." } ]
}
```

### ChatResponseSchema (수정, 비스트리밍)

```json
{ "status": "ready", "reply": "...", "conversationId": "uuid" }
```

### ChatStreamEventSchema (수정)

```text
{ "type": "meta", "conversationId": "uuid" }   // 스트림 맨 처음 1회
{ "type": "delta", "text": "..." }
{ "type": "done" }
{ "type": "error", "status": 503, "message": "..." }
```

### 신규: ChatConversationListResponseSchema

```json
{
  "items": [
    { "id": "uuid", "title": "...", "updatedAt": "...", "preview": "..." }
  ],
  "nextCursor": 12
}
```

### 신규: ChatConversationMessagesResponseSchema

```json
{
  "conversationId": "uuid",
  "messages": [ { "role": "user", "content": "..." } ]
}
```

## 8. REST API

```http
POST /api/v1/chat/messages/stream   (기존, conversationId 추가)
POST /api/v1/chat/messages          (기존, conversationId 추가)
GET  /api/v1/chat/conversations
GET  /api/v1/chat/conversations/:id/messages
```

### GET /chat/conversations

- `SessionAuthGuard` + `SameOriginGuard` + `@CurrentUser()`
- Query: `cursor?: number`, `limit?: number`(기본 12, 최대 30 — place-reels와 동일)
- 현재 로그인한 사용자의 대화만, `updatedAt DESC`

### GET /chat/conversations/:id/messages

- 동일 가드
- 다른 사용자의 대화이거나 존재하지 않으면 `404`(소유권 정보 비노출)

### 오류

- 계약 검증 실패: `400`
- 미로그인: `401 UNAUTHENTICATED`(기존과 동일)
- 존재하지 않거나 소유하지 않은 대화: `404`
- 같은 `requestId`를 다른 `messages`로 재사용: `409`(기존 충돌 처리, 변경 없음)

## 9. 프론트엔드 데이터 흐름

### 헤더 + 히스토리 패널

- `apps/web/src/app/chat/page.tsx` 헤더 우측에 `HistoryIcon`(lucide-react) 버튼
  추가
- 신규 `apps/web/src/features/chat/chat-history-panel.tsx`:
  `place-search-dialog.tsx`와 동일한 `@base-ui/react/dialog` 패턴을 쓰되,
  `items-end` + `translate-y` 대신 `items-stretch justify-end` +
  `translate-x`로 오른쪽 슬라이드를 구현
- 패널이 열릴 때 `GET /chat/conversations` 호출, "더 보기" 버튼으로 다음 페이지
  로드
- 항목 클릭 시 `GET /chat/conversations/:id/messages` 호출 → `messages` state
  교체, `activeConversationId` ref 설정, 패널 닫고 하단으로 스크롤

### 이어서 대화하기

- `send()`(`chat/page.tsx:40`) 요청 본문에 `conversationId:
  activeConversationId.current` 포함
- 스트리밍 응답의 `meta` 이벤트에서 받은 `conversationId`를
  `activeConversationId.current`에 저장(새 대화의 첫 응답에서 최초로 세팅)
- `read-chat-stream.ts`에 `meta` 이벤트 처리 추가 — 현재는 `delta`/`done`/`error`만
  처리하므로 그대로 두면 `event.text`가 `undefined`가 되어 깨진다. `onMeta`
  콜백을 추가하거나 반환값으로 전달한다.

### 알려진 제약

새 대화로 돌아가는 전용 버튼은 없다. `/chat`을 벗어났다 재진입(뒤로가기 후 재입장,
새로고침)하면 항상 새 대화 화면으로 시작하는 기존 동작을 그대로 활용한다.

## 10. 모듈 경계

```text
apps/api/prisma/schema.prisma
apps/api/prisma/migrations/<timestamp>_add_chat_conversations/

apps/api/src/chat/
├── chat-conversation.service.ts      (신규)
├── chat-conversation.service.spec.ts (신규)
├── chat-quota.service.ts             (수정: conversationId 해석 포함)
├── chat-access.service.ts            (수정: appendExchange 호출)
├── chat.controller.ts                (수정: meta 이벤트, 신규 GET 2개)
└── chat.module.ts                    (수정: ChatConversationService 등록)

packages/contracts/src/
├── chat.ts        (conversationId 필드 추가)
└── chat-errors.ts (meta 이벤트 추가)

apps/web/src/
├── app/chat/page.tsx                      (헤더 아이콘, conversationId 흐름)
├── features/chat/chat-history-panel.tsx   (신규)
├── features/chat/chat-history-api.ts      (신규: 목록/상세 fetch)
└── features/chat/read-chat-stream.ts      (meta 이벤트 처리 추가)
```

## 11. TDD와 검증 기준

### 공유 계약

- `conversationId` optional UUID 검증(있음/없음/잘못된 형식)
- `meta` 이벤트 파싱, 기존 `delta`/`done`/`error`와의 discriminated union 정합성

### API 단위 테스트

- `resolve`: conversationId 없을 때 신규 생성, 있을 때 소유자 확인, 타인 소유 시
  404
- `appendExchange`: user+assistant 메시지 저장(1ms 차이의 `createdAt`으로 순서 보장),
  `updatedAt` 갱신
- 같은 `requestId` 재시도 시 메시지가 중복 저장되지 않음(멱등성)
- 같은 `requestId`를 다른 `messages`로 보내면 409
- 같은 `requestId`를 스트리밍 중 알게 된 `conversationId`와 함께 재시도해도
  409 없이 성공함(부분 실패 후 재시도 회귀 방지)
- `listForUser`는 메시지가 하나도 없는 대화를 목록에서 제외함
- `listForUser`: cursor/limit, `updatedAt DESC` 정렬
- `getMessages`: 소유자가 아닌 요청은 404

### DB/E2E

- 대화 생성 → 메시지 저장 → 목록 조회 → 상세 조회가 실제 PostgreSQL에서 동작한다.
- 사용자 삭제 시 대화·메시지가 Cascade로 함께 삭제된다.

### 웹 단위 테스트

- 히스토리 패널: 목록 렌더링, "더 보기" cursor 동작, 항목 클릭 시 메시지 교체
- `send()`가 `activeConversationId`를 요청에 포함하고 응답의 `meta`로 갱신한다.
- `read-chat-stream`의 `meta` 이벤트 처리(콜백 호출, `text` 누적에 영향 없음)

### 실제 브라우저

```text
/chat → 메시지 전송 → 히스토리 아이콘 클릭
→ 패널이 오른쪽에서 슬라이드되어 나타남 → 방금 대화가 목록 최상단
→ 대화 클릭 → 메시지 복원 → 이어서 메시지 전송 → 같은 대화에 이어짐 확인(DB)
```

390px, 480px에서 검증. 콘솔 오류 없는지 확인한다.

## 12. 구현 완료 조건

- 챗봇 대화가 완료 시점에 PostgreSQL에 저장된다(재시도로 중복 저장되지 않음).
- 헤더 시계 아이콘 클릭 시 오른쪽에서 슬라이드되는 패널에 로그인한 사용자의 과거
  대화 목록이 표시된다.
- 목록에서 대화를 선택하면 메시지가 복원되고 이어서 대화할 수 있다.
- 다른 사용자의 대화는 조회/재개할 수 없다(404).
- 모든 공유 계약·API·DB·웹 테스트가 통과한다.
- 실제 모바일 폭에서 슬라이드 애니메이션과 전체 흐름이 검증된다.
- 이번 범위와 무관한 기존 챗봇 quota/idempotency 동작은 그대로 유지된다.

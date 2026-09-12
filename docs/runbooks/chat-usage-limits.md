# 챗봇 사용량 제한

기본 모델은 Claude Haiku 4.5 (`global.anthropic.claude-haiku-4-5-20251001-v1:0`)이며 `CHAT_BEDROCK_MODEL_ID`가 있으면 해당 설정을 사용한다. 일반·스트리밍 응답의 출력 상한은 512토큰이다.

## 사용 정책

- 챗봇은 로그인 사용자만 이용할 수 있다. 비로그인·만료된 세션 요청은 일반·스트리밍 API 모두 HTTP 401 (`UNAUTHENTICATED`)로 차단되며 사용량 차감이나 Bedrock 호출이 발생하지 않는다. 로그인 사용자는 서버 세션으로 확인한 userId별 하루 10회이며 두 API는 같은 횟수를 사용한다.
- 날짜 경계는 한국 시간 자정이다. 동일 계정의 여러 기기가 한도를 공유한다.
- 입력 검증·세션·모델 활성화 확인 후, Bedrock 호출 전에 DB에서 원자적으로 1회를 예약한다. 성공은 COMPLETED 저장 후 done 전송, Bedrock 오류·시간 초과·빈 답변은 REFUNDED 전환과 원래 날짜의 1회 복구를 한 트랜잭션으로 처리한다. 사용자 중단은 CANCELLED로 사용량을 유지한다. 입력 검증 실패·비활성 상태·한도 초과는 차감하지 않는다.
- 카운터 또는 세션 DB에 문제가 생기면 모델을 호출하지 않는다.
- 한도 초과는 스트리밍 헤더 전송 전에 HTTP 429, `code: CHAT_DAILY_LIMIT`, UTC ISO 형식 `resetsAt`, `Retry-After`로 반환한다. 화면에는 안내를 표시하고 재시도 버튼을 숨긴다. 날짜가 바뀌거나 로그인 상태를 바꾸면 페이지를 새로 열어 질문할 수 있다.
- 화면의 이전 대화는 유지하고, 모델에는 최근 4개 질문·답변 쌍과 현재 질문까지만 보낸다. 전체 12,000자를 넘으면 오래된 쌍부터 제외한다. 질문은 최대 2,000자다. 문자 수는 정확한 토큰 수가 아니다.
- API 직접 호출도 같은 제한을 받는다. 수신 스키마는 최대 101개 메시지와 메시지별 길이·역할 순서를 검증하고, 모델 전달 직전에 최근 대화만 선택한다. HTTP 본문 크기에는 기존 Express 제한도 적용된다.
- 사용량 식별키는 `user:<서버에서 확인한 userId>`이며 IP 기반 집계는 사용하지 않는다. 7일보다 오래된 일별 사용량은 매일 한국 시간 00:10에 정리한다.
- `/chat` 진입 시 서버에서 세션을 확인하고 비로그인이면 `/login?returnTo=%2Fchat`으로 이동한다. 대화 중 세션이 만료되면 로그인 안내와 로그인 링크를 표시하고 재시도 버튼을 숨긴다.

## 오류 응답

| 상태 | 안내 문구 | 화면 동작 |
| --- | --- | --- |
| 400 | 질문이 너무 깁니다. | 거절된 질문을 입력창에 복원하고 수정 후 전송 |
| 429 | 오늘 질문 횟수를 모두 사용했어요. 내일 다시 이용해 주세요. | 재시도 차단 |
| 503 | 현재 챗봇을 사용할 수 없습니다. | 재시도 제공 |
| 504 | 답변 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요. | 재시도 제공 |
| 502 / Bedrock 오류 | AI 답변 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요. | 재시도 제공 |

401은 기존 로그인 안내를 유지한다. 브라우저가 HTTP 413을 받으면 입력 길이 오류로 안내한다. 원본 AWS 오류나 프록시 HTML은 화면에 노출하지 않는다.

응답이 시작되기 전 오류는 해당 HTTP 코드와 Problem Details로 반환한다. 첫 텍스트가 전송된 이후에는 HTTP 코드를 바꿀 수 없으므로 NDJSON `error` 이벤트에 `status`와 안전한 `message`를 포함한다. 화면은 부분 답변을 유지하고 해당 안내를 표시한다. 일반 응답 성공 본문은 `{ status: "ready", reply }`이며 실패를 정상 200/201 본문의 `unavailable`로 반환하지 않는다.

서버는 답변 전체에 55초 제한을 적용하고 초과 시 Bedrock 요청을 취소한다. 브라우저의 전체 요청 제한은 60초다. 사용자가 페이지를 떠나 취소한 스트림에는 시간 초과 안내를 띄우지 않는다. 응답 시간 초과 및 Bedrock 오류는 부분 답변 수신 여부와 무관하게 예약 사용량을 복구한다.

## 배포

1. `CHAT_ENABLED=true`, `CHAT_AWS_REGION`을 설정하고 `CHAT_BEDROCK_MODEL_ID`의 운영 재정의 여부를 확인한다. 모델 ID를 비워두면 Haiku 4.5 기본값을 사용한다. IP 해시 비밀키나 프록시 신뢰 설정은 이 기능에 필요하지 않다.
2. API 배포 환경에서 `pnpm db:deploy`로 `20260911093000_add_chat_daily_usage` 마이그레이션을 적용한 뒤 새 API와 웹을 배포한다. 이미 적용한 환경에서는 추가 마이그레이션이 필요 없다.
3. API·웹을 같은 로그인 쿠키가 전달되는 호스트 경로로 제공한다. 웹 요청은 `credentials: include`를 사용하지만 기존 `__Host-` 세션 쿠키의 호스트 범위는 유지된다. POST에는 설정된 `WEB_ORIGIN`과 같은 Origin이 필요하다.
4. 배포 후 비로그인은 로그인 화면으로 이동하고 API 직접 호출도 401로 거절되는지, 로그인 사용자의 11번째 질문은 429로 거절되는지 확인한다. 클라이언트가 보내는 userId나 IP 헤더로 계정별 한도를 우회할 수 없어야 한다.

계정별 제한은 서비스 전체의 고정 비용 상한은 아니다. 여러 계정의 합계까지 제어하는 전역 상한은 별도 기능이다.

## 검증

```sh
pnpm --filter @haetteum/contracts test
pnpm --filter @haetteum/api test
pnpm --filter @haetteum/web test tests/unit/app/chat-page.test.tsx tests/unit/app/chat-layout.test.tsx tests/unit/features/chat
pnpm --filter @haetteum/api test:e2e --testPathPatterns=chat-limits
```

DB 통합 테스트는 로컬 `DATABASE_URL`만 허용하며, UUID 기반 임시 스키마를 생성·검증·삭제한다. 개발용 접속 정보가 API `.env`에만 있다면 API 디렉터리에서 다음과 같이 실행한다. 실제 Bedrock 호출은 발생하지 않는다.

```sh
node --env-file=.env --experimental-vm-modules ./node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand --testPathPatterns=chat-limits
```


## requestId와 배포

- 새 질문은 새 UUID, 다시 시도는 동일 requestId를 사용한다. userId는 세션에서만 얻는다.
- 같은 사용자/ID의 완료 요청은 저장된 답변을 재전송한다. 처리 중·취소 요청과 본문이 다른 중복 요청은 409로 차단한다. 복구된 요청만 재예약한다. 실행별 attemptId로 늦게 도착한 콜백을 차단한다.
- 호환성을 위해 requestId 없는 기존 클라이언트도 허용하지만 서버가 매번 새 ID를 부여하므로 중복 방지 대상이 아니다.
- API 배포 전에 `20260912140000_chat_request_reservations` 마이그레이션을 적용해야 한다. 완료 답변은 재전송을 위해 일별 기준 7일 보관 후 매일 00:10 KST에 정리한다. 정리 후 동일 ID 재요청은 새 요청이 된다.
- 프로세스 강제 종료/DB 장애로 남은 RESERVED는 자동 복구하지 않는다. 해당 요청의 실제 실행 결과를 확인한 뒤 운영자가 처리해야 한다. 복구 트랜잭션 실패 시에도 원자성이 유지되지만 사용자에게 즉시 사용량이 돌아오지는 않는다.

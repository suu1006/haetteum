# 반복 컴포넌트 공통화

사용자가 승인한 순서로 진행한다. 기존 문구, 데이터 요청, URL 이동과 레이아웃을 보존한다.

1. Modal/Menu: Backdrop/Popup/Close/Trigger/Item 기본 스타일을 UI 계층에서 합성하고 5개 모달·3개 메뉴 호출부의 중복을 제거한다. ref, render, initialFocus 및 이벤트는 그대로 전달한다.
2. 상태 표시: 기존 empty/error 패턴의 시각적 변형과 action을 지원하고 검색·추천 목록의 반복 박스를 연결한다. LoadingState는 상태 의미와 호출자 레이아웃 재정의를 제공한다.
3. 화면 내부 탭: 링크 Tabs와 별도로 선택 상태와 방향키/Home/End, roving tabindex를 공유하는 SelectionTabs를 제공한다. 후기와 일정 탭에 적용한다.
4. 버튼/입력: 인증용 버튼과 입력, 검색 입력을 공통 Button/Input으로 합성한다. 로딩 중 중복 제출을 막고 기존 크기와 스타일을 유지한다.

검증: 관련 컴포넌트 테스트 → 전체 웹 테스트 → 타입/린트 → Webpack production build. 기존 실패는 별도로 비교한다. 외부 서비스와 DB는 변경하지 않는다.

## 완료 및 검증

- Modal 5개, Menu 3개 호출부의 반복 스타일을 UI 계층으로 이동. 별도 bottom sheet는 unstyled로 기존 스타일을 유지한다.
- EmptyState 사용 파일 4개(공통 ErrorState 포함), ErrorState 5개, LoadingState 3개로 확대.
- SelectionTabs를 후기/일정 2개 화면에 적용. SearchInput을 지역 검색/장소 검색 모달 2곳에 적용.
- 인증 입력·버튼과 GET 검색창을 공통 Input/Button으로 합성. 로딩 중 disabled=false에도 제출이 차단되는 회귀 테스트 추가.
- 타입 검사 및 Webpack production build 통과. 전체 테스트 694 통과, 기존 review-moderation 4개 실패 유지(작업 전 692 통과/4 실패).
- 별도 코드 리뷰에서 신규 동작 오류 없음. LoadingState의 호출자 className 대체 계약을 코드/문서에 명시.
- 실제 로그인 화면과 비밀번호 표시 전환 확인.

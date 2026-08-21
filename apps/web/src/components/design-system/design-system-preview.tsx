"use client";

import {
  BookmarkIcon,
  ChevronRightIcon,
  MapPinIcon,
  SparklesIcon,
  StarIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { ItineraryItem } from "@/components/travel/itinerary-item";
import { PlaceCard } from "@/components/travel/place-card";
import { RatingSummary } from "@/components/travel/rating-summary";
import { ReviewCard } from "@/components/travel/review-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const colors = [
  { name: "Primary", value: "#6F3DE5", className: "bg-primary" },
  {
    name: "Primary subtle",
    value: "#F7F3FF",
    className: "bg-primary-subtle",
  },
  { name: "Rating", value: "#FFB020", className: "bg-rating" },
  {
    name: "Current location",
    value: "#2F80ED",
    className: "bg-current-location",
  },
  { name: "Destructive", value: "#D6363B", className: "bg-destructive" },
] as const;

function PreviewSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
      <div className="mb-5 border-b border-border pb-4">
        <h2 className="type-title-md">{title}</h2>
        <p className="type-body-md mt-1 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function DesignSystemPreview() {
  const [previewPlaceSaved, setPreviewPlaceSaved] = useState(false);

  return (
    <main className="safe-area-inline min-h-screen bg-background py-10 sm:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10 max-w-2xl sm:mb-12">
          <div className="mb-5 flex items-center gap-2" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-current-location" />
            <span className="h-0.5 w-12 rounded-full bg-route-line" />
            <span className="size-2.5 rounded-full border-2 border-primary bg-background" />
          </div>
          <p className="type-label mb-2 text-primary">FOUNDATION · LIGHT</p>
          <h1 className="type-display">Haetteum 디자인 시스템</h1>
          <p className="type-body-lg mt-3 text-muted-foreground">
            여행의 설렘은 이미지에 맡기고, 인터페이스는 다음 행동과 정보를
            명확하게 안내합니다.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <PreviewSection
            title="색상"
            description="보라색은 행동과 선택, 파란색은 현재 위치를 나타냅니다."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {colors.map((color) => (
                <div key={color.name} className="min-w-0">
                  <div
                    className={`mb-2 h-16 rounded-lg border border-black/5 ${color.className}`}
                  />
                  <p className="type-label truncate">{color.name}</p>
                  <p className="type-caption text-muted-foreground">
                    {color.value}
                  </p>
                </div>
              ))}
            </div>
          </PreviewSection>

          <PreviewSection
            title="타이포그래피"
            description="Pretendard Variable 한 가지로 정보 계층을 명확히 나눕니다."
          >
            <div className="space-y-5">
              <div>
                <p className="type-caption mb-1 text-muted-foreground">Display</p>
                <p className="type-display">새로운 여행을 시작해요</p>
              </div>
              <div>
                <p className="type-caption mb-1 text-muted-foreground">Title</p>
                <p className="type-title-md">제주에서 꼭 가볼 곳</p>
              </div>
              <div>
                <p className="type-caption mb-1 text-muted-foreground">Body</p>
                <p className="type-body-md text-muted-foreground">
                  후기와 이동 경로를 함께 살펴보고 나만의 일정을 만들어 보세요.
                </p>
              </div>
            </div>
          </PreviewSection>

          <PreviewSection
            title="버튼"
            description="기본 조작은 44px, 하단 주요 행동은 52px 높이를 사용합니다."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button>코스 보기</Button>
              <Button variant="secondary">후기 더 보기</Button>
              <Button variant="outline">지역 선택</Button>
              <Button variant="ghost">건너뛰기</Button>
              <Button variant="destructive">일정 삭제</Button>
              <Button disabled>저장 중</Button>
              <Button size="icon" variant="outline" aria-label="장소 저장">
                <BookmarkIcon />
              </Button>
            </div>

            <div className="mt-4 rounded-xl bg-primary p-4">
              <Button variant="glass">
                <SparklesIcon data-icon="inline-start" />
                AI 코스 추천받기
              </Button>
            </div>

            <Button className="mt-4 w-full" size="lg">
              코스 수정하기
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </PreviewSection>

          <PreviewSection
            title="선택 컨트롤"
            description="선택 상태는 색상과 테두리·굵기를 함께 바꿔 전달합니다."
          >
            <div className="space-y-5">
              <div>
                <p className="type-label mb-2">독립 선택</p>
                <div className="flex flex-wrap gap-2">
                  <Toggle defaultPressed aria-label="저장된 장소만 보기">
                    <BookmarkIcon data-icon="inline-start" />
                    저장
                  </Toggle>
                  <Toggle variant="outline" aria-label="평점 높은 장소만 보기">
                    <StarIcon data-icon="inline-start" />
                    평점순
                  </Toggle>
                </div>
              </div>

              <div>
                <p className="type-label mb-2">지역 필터</p>
                <ToggleGroup
                  aria-label="지역 선택"
                  defaultValue={["jeju"]}
                  type="single"
                  variant="outline"
                >
                  <ToggleGroupItem value="all">전체</ToggleGroupItem>
                  <ToggleGroupItem value="jeju">제주</ToggleGroupItem>
                  <ToggleGroupItem value="busan">부산</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </PreviewSection>

          <PreviewSection
            title="검색 입력"
            description="검색과 필터 입력은 기본 44px 높이와 명확한 포커스 링을 사용합니다."
          >
            <label className="type-label mb-2 block" htmlFor="preview-search-input">
              여행지 검색
            </label>
            <Input
              id="preview-search-input"
              placeholder="지역, 관광지, 축제 검색"
              type="search"
            />
          </PreviewSection>

          <div className="md:col-span-2">
            <PreviewSection
              title="카드"
              description="일반 카드는 밝은 surface와 얇은 테두리를 사용하고 도메인 정보는 합성합니다."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>성산일출봉</CardTitle>
                    <CardDescription>
                      제주 동부의 바다와 일출을 한눈에 볼 수 있어요.
                    </CardDescription>
                    <CardAction>
                      <Button size="icon" variant="ghost" aria-label="성산일출봉 저장">
                        <BookmarkIcon />
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1 text-rating">
                        <StarIcon className="size-4 fill-current" aria-hidden="true" />
                        <span className="type-label text-foreground">4.8</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPinIcon className="size-4" aria-hidden="true" />
                        <span className="type-caption">제주 서귀포시</span>
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" variant="secondary">
                      장소 정보 보기
                    </Button>
                  </CardFooter>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>다음 일정</CardTitle>
                    <CardDescription>오후 2:30 · 해안 산책로</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary-subtle text-primary">
                        <MapPinIcon className="size-4" aria-hidden="true" />
                      </span>
                      <p className="type-body-md text-muted-foreground">
                        현재 위치에서 차량으로 약 18분
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </PreviewSection>
          </div>

          <div className="md:col-span-2">
            <PreviewSection
              title="여행 콘텐츠"
              description="데이터와 상태를 명시적 props로 받아 장소·후기·일정을 같은 정보 위계로 표현합니다."
            >
              <div className="grid min-w-0 gap-5 md:grid-cols-2">
                <PlaceCard
                  title="성산일출봉"
                  location="제주 서귀포시 성산읍 일출로 284-12"
                  rating={4.8}
                  reviewCount={1284}
                  tags={["일출 명소", "가벼운 산책", "주차 가능"]}
                  saved={previewPlaceSaved}
                  onSavedChange={setPreviewPlaceSaved}
                  media={
                    <div
                      className="relative overflow-hidden bg-linear-to-br from-primary-subtle via-background to-current-location/20"
                      aria-label="성산일출봉 풍경 예시"
                    >
                      <span className="absolute top-7 right-7 size-14 rounded-full bg-rating/75" />
                      <span className="absolute right-[-12%] bottom-[-40%] h-[82%] w-[76%] rounded-[50%] bg-current-location/20" />
                      <span className="absolute bottom-0 left-[-10%] h-[52%] w-[82%] rounded-[45%_60%_0_0] bg-primary/85" />
                      <span className="type-label absolute bottom-4 left-4 rounded-full bg-card/90 px-3 py-1.5 text-primary shadow-card backdrop-blur-sm">
                        JEJU · 06:12
                      </span>
                    </div>
                  }
                />

                <div className="min-w-0 space-y-5">
                  <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
                    <p className="type-label mb-4 text-muted-foreground">
                      통합 평점
                    </p>
                    <RatingSummary
                      value={4.8}
                      reviewCount={1284}
                      distribution={[
                        { score: 5, count: 900 },
                        { score: 4, count: 270 },
                        { score: 3, count: 76 },
                        { score: 2, count: 26 },
                        { score: 1, count: 12 },
                      ]}
                    />
                  </div>

                  <ReviewCard
                    author="여행자 민지"
                    rating={5}
                    date="2026. 8. 12."
                    content="아침 일찍 가니 바람이 선선하고, 정상까지 이어지는 풍경을 조용히 즐길 수 있었어요. 내려온 뒤 근처 해안도로까지 함께 둘러보기 좋아요."
                    provider="네이버 여행"
                    avatar={
                      <span className="type-label" aria-hidden="true">
                        민
                      </span>
                    }
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-border pt-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="type-label text-primary">DAY 1 · JEJU EAST</p>
                    <h3 className="type-title-md mt-1">제주 하루 일정</h3>
                  </div>
                  <p className="type-caption text-muted-foreground">
                    총 3개 장소 · 약 6시간
                  </p>
                </div>
                <ol aria-label="제주 하루 일정" className="min-w-0">
                  <ItineraryItem
                    order={1}
                    time="08:00"
                    title="성산일출봉"
                    location="제주 서귀포시 성산읍"
                    status="completed"
                    travelDuration="차량 18분"
                  />
                  <ItineraryItem
                    order={2}
                    time="11:30"
                    title="섭지코지 해안 산책로"
                    location="제주 서귀포시 성산읍 고성리"
                    status="current"
                    travelDuration="차량 24분"
                  />
                  <ItineraryItem
                    order={3}
                    time="14:30"
                    title="비자림"
                    location="제주 제주시 구좌읍 비자숲길"
                    status="upcoming"
                    isLast
                  />
                </ol>
              </div>
            </PreviewSection>
          </div>
        </div>
      </div>
    </main>
  );
}

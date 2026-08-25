import { WelcomeActions } from "@/components/patterns/welcome-actions";
import { WelcomeCourseStepCard } from "@/components/patterns/welcome-course-step-card";

function WelcomeCourseSlide() {
  return (
    <section aria-labelledby="welcome-course-title">
      <h2
        aria-label="하나의 장소로 주변 맛집, 가볼만한 곳을 하나의 코스로!"
        id="welcome-course-title"
        className="text-3xl font-bold leading-tight tracking-[-0.03em] text-white"
      >
        하나의 장소로
        <br />
        주변 맛집, 가볼만한 곳을
        <br />
        하나의 코스로!
      </h2>

      <ol aria-label="AI 여행 코스 구성" className="mt-8 flex gap-6">
        <WelcomeCourseStepCard
          accent="primary"
          badge="대표 장소"
          description="후기와 거리까지 확인"
          imageAlt="제주 해안 일출"
          imageSrc="/images/discovery/main-hero-jeju.png"
          title="여행의 시작점"
        />
        <WelcomeCourseStepCard
          accent="reviews"
          badge="근처 맛집"
          description="후기와 거리까지 확인"
          imageAlt="제주 유채꽃 풍경"
          imageSrc="/images/discovery/festival-jeju.png"
          title="맛있는 한 끼"
        />
        <WelcomeCourseStepCard
          accent="route"
          badge="가볼만한 곳"
          description="후기와 거리까지 확인"
          imageAlt="제주 성산일출봉"
          imageSrc="/images/discovery/place-seongsan.png"
          isLast
          title="함께 둘러볼 곳"
        />
      </ol>

      <p className="mt-7 text-base leading-6 text-white/85">
        선택한 장소를 기준으로 거리와 동선을 고려해 한 번에 추천해드려요.
      </p>

      <WelcomeActions className="mt-7" desktop />
    </section>
  );
}

export { WelcomeCourseSlide };

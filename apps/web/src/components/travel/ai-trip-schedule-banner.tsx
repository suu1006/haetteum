import Image from "next/image";

type AiTripScheduleBannerProps = {
  onRecommend: () => void;
};

function AiTripScheduleBanner({ onRecommend }: AiTripScheduleBannerProps) {
  return (
    <button
      type="button"
      onClick={onRecommend}
      aria-label="AI 맞춤 일정 추천 받기"
      className="relative flex min-h-20 w-full items-center overflow-hidden rounded-[1.1rem] bg-primary-subtle px-5 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/25"
    >
      <span className="relative z-10 min-w-0 pr-24">
        <span className="block text-[0.8rem] font-medium text-muted-foreground">
          여행 계획이 고민될 땐?
        </span>
        <span className="mt-1 block text-[1rem] font-bold text-primary">
          AI 맞춤 일정 추천 받기
        </span>
      </span>
      <span className="absolute inset-y-0 right-3 w-24">
        <Image
          src="/images/discovery/reference-main/ai-course-robot.png"
          alt="AI 여행 일정 도우미"
          fill
          sizes="96px"
          loading="eager"
          className="object-contain object-right-bottom"
        />
      </span>
    </button>
  );
}

export { AiTripScheduleBanner, type AiTripScheduleBannerProps };

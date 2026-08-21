import Image from "next/image";
import Link from "next/link";
import { MessageCircleMore, Route, Trophy } from "lucide-react";

import { WelcomeFeatureCard } from "@/components/patterns/welcome-feature-card";
import { Button, buttonVariants } from "@/components/ui/button";

const welcomeFeatures = [
  {
    accent: "ranking" as const,
    description: (
      <>
        세대별·지역별 인기 여행지를{" "}
        <span className="whitespace-nowrap">한눈에 확인</span>
      </>
    ),
    icon: Trophy,
    title: "인기 관광지 순위",
  },
  {
    accent: "course" as const,
    description: (
      <>
        맛집부터 관광지까지{" "}
        <span className="whitespace-nowrap">최적의 경로 추천</span>
      </>
    ),
    icon: Route,
    title: "AI 맞춤 여행 코스",
  },
  {
    accent: "reviews" as const,
    description: (
      <>
        카카오맵, 구글맵, 네이버 블로그{" "}
        <span className="whitespace-nowrap">후기를 한 번에</span>
      </>
    ),
    icon: MessageCircleMore,
    title: "통합 후기 탐색",
  },
];

function WelcomeHero() {
  return (
    <section
      aria-labelledby="welcome-title"
      className="relative isolate min-h-svh w-full overflow-hidden bg-foreground text-white md:min-h-[calc(100svh-4rem)] md:max-w-[30rem] md:rounded-[2rem] md:shadow-overlay"
    >
      <Image
        alt=""
        className="object-cover object-center"
        fill
        preload
        sizes="(min-width: 768px) 480px, 100vw"
        src="/images/welcome-balloon-valley-v2.png"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-black/24" />

      <div className="safe-area-top safe-area-bottom relative z-10 flex min-h-svh flex-col md:min-h-[calc(100svh-4rem)]">
        <div className="flex flex-1 flex-col px-5 pb-6 pt-20 min-[360px]:px-8 min-[360px]:pb-12 md:pb-8 md:pt-24">
          <header className="max-w-80 text-balance drop-shadow-sm">
            <h1
              aria-label="여행, 지금 가장 스마트하게!"
              id="welcome-title"
              className="type-display"
            >
              여행, 지금
              <br />
              가장 스마트하게!
            </h1>
            <p className="mt-4 max-w-72 break-keep type-body-lg text-white/88">
              AI가 당신만을 위한 완벽한 여행을 추천해드려요.
            </p>
          </header>

          <div className="mt-auto grid gap-3 pt-24 sm:pt-32">
            {welcomeFeatures.map((feature) => (
              <WelcomeFeatureCard key={feature.title} {...feature} />
            ))}

            <div className="mt-4 grid gap-2">
              <Link
                className={buttonVariants({
                  className: "w-full rounded-xl shadow-floating",
                  size: "lg",
                })}
                href="/"
              >
                여행 시작하기
              </Link>
              <Button
                className="w-full text-white hover:bg-white/10 hover:text-white disabled:opacity-90"
                disabled
                variant="ghost"
              >
                로그인
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { WelcomeHero };

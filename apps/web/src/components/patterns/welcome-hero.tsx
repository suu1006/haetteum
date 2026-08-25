import { getImageProps } from "next/image";
import { MessageCircleMore, Route, Trophy } from "lucide-react";

import { WelcomeActions } from "@/components/patterns/welcome-actions";
import { WelcomeDesktopShowcase } from "@/components/patterns/welcome-desktop-showcase";
import { WelcomeFeatureCard } from "@/components/patterns/welcome-feature-card";

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
  const {
    props: { sizes: desktopSizes, srcSet: desktopSrcSet },
  } = getImageProps({
    alt: "",
    fetchPriority: "high",
    height: 941,
    sizes: "100vw",
    src: "/images/welcome-lake-desktop.png",
    width: 1672,
  });
  const {
    props: {
      sizes: mobileSizes,
      srcSet: mobileSrcSet,
      ...mobileImageProps
    },
  } = getImageProps({
    alt: "",
    fetchPriority: "high",
    height: 1870,
    sizes: "(min-width: 768px) 480px, 100vw",
    src: "/images/welcome-balloon-valley-v2.png",
    width: 841,
  });

  return (
    <section
      aria-labelledby="welcome-title"
      className="relative isolate min-h-svh w-full overflow-hidden bg-foreground text-white md:min-h-[calc(100svh-4rem)] md:max-w-[30rem] md:rounded-[2rem] md:shadow-overlay lg:min-h-svh lg:max-w-none lg:rounded-none lg:shadow-none"
    >
      <picture>
        <source
          media="(min-width: 1024px)"
          sizes={desktopSizes}
          srcSet={desktopSrcSet}
        />
        <source
          media="(max-width: 1023px)"
          sizes={mobileSizes}
          srcSet={mobileSrcSet}
        />
        <img
          {...mobileImageProps}
          alt=""
          className="absolute inset-0 size-full object-cover object-center"
        />
      </picture>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/24 lg:bg-black/28"
      />

      <div className="safe-area-top safe-area-bottom relative z-10 flex min-h-svh flex-col md:min-h-[calc(100svh-4rem)] lg:min-h-svh">
        <div className="flex flex-1 flex-col px-5 pb-6 pt-20 min-[360px]:px-8 min-[360px]:pb-12 md:pb-8 md:pt-24 lg:mx-auto lg:grid lg:w-full lg:grid-cols-[minmax(0,0.9fr)_minmax(30rem,1.1fr)] lg:items-center lg:gap-16 lg:px-10 lg:py-12 xl:w-[83%] xl:max-w-[86.75rem] xl:gap-48 xl:px-0">
          <header className="max-w-80 text-balance drop-shadow-sm lg:max-w-[32rem] lg:drop-shadow-md xl:translate-x-9 xl:translate-y-4">
            <h1
              aria-label="여행, 지금 가장 스마트하게!"
              id="welcome-title"
              className="type-display type-display-desktop"
            >
              여행, 지금
              <br />
              가장 스마트하게!
            </h1>
            <p className="mt-4 max-w-72 break-keep type-body-lg text-white/88 lg:mt-6 lg:max-w-[30rem] lg:text-xl lg:leading-8">
              AI가 당신만을 위한 완벽한 여행을 추천해드려요.
            </p>
            <div
              aria-hidden="true"
              className="mt-8 hidden max-w-[26rem] border-t border-white/35 lg:block"
            />
          </header>

          <div className="mt-auto grid gap-3 pt-24 sm:pt-32 lg:mt-0 lg:w-full lg:max-w-[34rem] lg:translate-y-5 lg:justify-self-end lg:gap-2 lg:pt-0 xl:w-[34rem] xl:max-w-none min-[1440px]:w-[39rem]">
            <div className="grid gap-3 lg:hidden">
              {welcomeFeatures.map((feature) => (
                <WelcomeFeatureCard key={feature.title} {...feature} />
              ))}
              <WelcomeActions className="mt-4" />
            </div>

            <WelcomeDesktopShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}

export { WelcomeHero };

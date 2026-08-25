import Image from "next/image";
import Link from "next/link";

import type { MyPageData } from "@/features/profile/my-page-model";

type MyPageAiBannerProps = {
  recommendation: MyPageData["aiRecommendation"];
};

function MyPageAiBanner({ recommendation }: MyPageAiBannerProps) {
  return (
    <Link
      href={recommendation.href}
      aria-label={recommendation.title}
      className="relative block min-h-[6.25rem] overflow-hidden rounded-[1.5rem] bg-[#f7f3ff] px-5 py-5 shadow-card outline-none transition-colors hover:bg-primary-subtle focus-visible:ring-3 focus-visible:ring-ring/25"
    >
      <div className="relative z-10 max-w-[70%]">
        <h2 className="text-[1rem] font-bold leading-6 tracking-[-0.02em] text-foreground">
          {recommendation.title}
        </h2>
        <p className="mt-1 break-keep text-[0.78rem] font-semibold leading-5 text-primary/70">
          {recommendation.description}
        </p>
      </div>
      <Image
        src={recommendation.image.src}
        alt={recommendation.image.alt}
        width={132}
        height={120}
        sizes="144px"
        className="absolute right-0 bottom-0 h-[6.25rem] w-36 object-contain object-right-bottom"
      />
    </Link>
  );
}

export { MyPageAiBanner, type MyPageAiBannerProps };

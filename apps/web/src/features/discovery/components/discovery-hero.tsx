import Image from "next/image";

import type { DiscoveryImage } from "@/features/discovery/discovery-model";

type DiscoveryHeroProps = {
  image: DiscoveryImage;
};

function DiscoveryHero({ image }: DiscoveryHeroProps) {
  return (
    <section className="relative isolate h-60 overflow-hidden bg-primary-subtle text-image-foreground">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        preload
        sizes="(max-width: 480px) 100vw, 30rem"
        className="object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-image-scrim" />
      <div className="safe-area-top relative z-10 flex h-full flex-col justify-end px-5 pb-14">
        <p className="type-label text-image-foreground-muted">
          여행자님, 반가워요
        </p>
        <h1 className="type-title-lg mt-2 max-w-64 break-keep text-image-foreground">
          오늘은 어디로 떠나볼까요?
        </h1>
      </div>
    </section>
  );
}

export { DiscoveryHero, type DiscoveryHeroProps };

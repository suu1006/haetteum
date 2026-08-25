import Image from "next/image";
import Link from "next/link";

import type { ExploreCategory } from "@/features/explore/explore-model";
import { cn } from "@/lib/utils";

type ExploreCategoryLinkProps = {
  category: ExploreCategory;
};

const toneClassNames: Record<ExploreCategory["tone"], string> = {
  purple: "bg-primary-subtle",
  blue: "bg-blue-50",
  green: "bg-emerald-50",
  amber: "bg-amber-50",
};

function ExploreCategoryLink({ category }: ExploreCategoryLinkProps) {
  return (
    <Link
      href={category.href}
      className="group flex min-w-0 flex-col items-center gap-2 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
    >
      <span
        className={cn(
          "mx-auto flex size-14 items-center justify-center rounded-2xl transition-transform duration-150 group-hover:-translate-y-0.5",
          toneClassNames[category.tone],
        )}
      >
        <Image
          src={category.image.src}
          alt={category.image.alt}
          width={56}
          height={56}
          className="size-10 object-contain"
        />
      </span>
      <span className="type-caption truncate text-center font-medium text-foreground">
        {category.label}
      </span>
    </Link>
  );
}

export { ExploreCategoryLink, type ExploreCategoryLinkProps };

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type ExploreSectionHeaderProps = {
  headingId: string;
  title: ReactNode;
  moreHref: string;
};

function ExploreSectionHeader({
  headingId,
  title,
  moreHref,
}: ExploreSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2
        id={headingId}
        className="type-title-md inline-flex items-center gap-1.5 text-foreground"
      >
        {title}
      </h2>
      <Link
        href={moreHref}
        prefetch={false}
        className="type-body-md inline-flex min-h-11 items-center gap-0.5 rounded-lg px-1 text-muted-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        더보기
        <ChevronRightIcon className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export { ExploreSectionHeader, type ExploreSectionHeaderProps };

import Image from "next/image";

type ReviewPlaceSummaryCardProps = {
  title: string;
  location: string;
  imageUrl: string | null;
};

function ReviewPlaceSummaryCard({
  title,
  location,
  imageUrl,
}: ReviewPlaceSummaryCardProps) {
  return (
    <section
      aria-label="후기 관광지"
      className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-3 shadow-card"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-primary-subtle">
        {imageUrl != null ? (
          <Image
            src={imageUrl}
            alt={`${title} 대표 이미지`}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="type-body-md truncate font-semibold text-foreground">
          {title}
        </p>
        <p className="type-caption mt-1 truncate text-muted-foreground">
          {location}
        </p>
      </div>
    </section>
  );
}

export { ReviewPlaceSummaryCard, type ReviewPlaceSummaryCardProps };

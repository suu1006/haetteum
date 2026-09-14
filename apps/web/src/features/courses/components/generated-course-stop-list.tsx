import type {
  GeneratedCourseStop,
  GeneratedCourseStopRole,
} from "@haetteum/contracts";

const ROLE_LABELS: Record<GeneratedCourseStopRole, string> = {
  anchor: "지금 보는 곳",
  attraction: "명소",
  cafe: "카페",
  restaurant: "맛집",
};

function GeneratedCourseStopCard({
  stop,
  roleLabel,
}: {
  stop: GeneratedCourseStop;
  roleLabel: string;
}) {
  return (
    <div className="min-w-0">
      <span className="type-caption mb-1 inline-block rounded-full bg-primary-subtle px-2 py-0.5 font-semibold text-primary">
        {roleLabel}
      </span>
      <div>
        {stop.placeUrl ? (
          <a
            href={stop.placeUrl}
            target="_blank"
            rel="noreferrer"
            className="type-label text-foreground underline-offset-4 hover:underline"
          >
            {stop.title}
          </a>
        ) : (
          <span className="type-label text-foreground">{stop.title}</span>
        )}
      </div>
      {stop.address ? (
        <p className="type-caption mt-1 text-muted-foreground">
          {stop.address}
        </p>
      ) : null}
      {stop.distanceMeters != null && stop.distanceMeters > 0 ? (
        <p className="type-caption text-muted-foreground">
          직선거리 {stop.distanceMeters.toLocaleString("ko-KR")}m
        </p>
      ) : null}
    </div>
  );
}

function GeneratedCourseStopList({
  stops,
  anchorLabel = ROLE_LABELS.anchor,
}: {
  stops: GeneratedCourseStop[];
  anchorLabel?: string;
}) {
  const labels = { ...ROLE_LABELS, anchor: anchorLabel };

  return (
    <ol aria-label="추천 코스 경유지">
      {stops.map((stop, index) => {
        const last = index === stops.length - 1;
        return (
          <li
            key={`${stop.role}-${stop.sequence}`}
            className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 pb-3 last:pb-0"
          >
            {!last ? (
              <span
                className="absolute top-7 bottom-0 left-[0.8125rem] w-px bg-primary/25"
                aria-hidden="true"
              />
            ) : null}
            <span className="type-caption relative z-10 mt-1 flex size-7 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
              {stop.sequence}
            </span>
            <div className="pt-1">
              <GeneratedCourseStopCard stop={stop} roleLabel={labels[stop.role]} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export { GeneratedCourseStopCard, GeneratedCourseStopList, ROLE_LABELS };

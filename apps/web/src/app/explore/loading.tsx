function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function ExploreLoading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto min-h-screen w-full max-w-[30rem] bg-card pb-24">
        <header className="flex items-center justify-between px-5 pt-[25px] pb-4">
          <h1 className="text-[1.55rem] font-bold leading-9 tracking-[-0.03em] text-foreground">
            탐색
          </h1>
          <SkeletonBlock className="size-11 rounded-full" />
        </header>

        <section aria-label="여행지 검색" className="px-5">
          <SkeletonBlock className="h-12 w-full rounded-full" />
        </section>

        <section className="px-5 pt-5">
          <SkeletonBlock className="h-6 w-40" />
          <ol className="mt-3 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="min-w-0">
                <SkeletonBlock className="aspect-square w-full" />
                <SkeletonBlock className="mt-2 h-4 w-3/4" />
              </li>
            ))}
          </ol>
        </section>

        <section className="px-5 pt-6">
          <SkeletonBlock className="h-6 w-32" />
          <div className="mt-3 grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-8 w-full" />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="min-w-0">
                <SkeletonBlock className="aspect-square w-full" />
                <SkeletonBlock className="mt-2 h-4 w-3/4" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

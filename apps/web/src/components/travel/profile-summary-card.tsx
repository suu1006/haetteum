import Image from "next/image";

import type { MyPageProfile } from "@/features/profile/my-page-model";

type ProfileSummaryCardProps = {
  profile: MyPageProfile;
};

function ProfileSummaryCard({ profile }: ProfileSummaryCardProps) {
  return (
    <section
      aria-label="여행자 프로필"
      className="grid min-h-28 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-4 rounded-[1.5rem] bg-card px-5 py-4 shadow-floating max-[359px]:grid-cols-[3.75rem_minmax(0,1fr)] max-[359px]:gap-x-3 max-[359px]:px-4"
    >
      <Image
        src={profile.image.src}
        alt={profile.image.alt}
        width={144}
        height={144}
        priority
        sizes="72px"
        className="size-18 rounded-full object-cover max-[359px]:size-15"
      />
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="truncate text-[1.3rem] font-bold leading-7 tracking-[-0.025em] text-foreground">
            {profile.nickname}
          </h2>
          <span className="rounded-full border border-primary/60 bg-primary-subtle px-2.5 py-0.5 text-[0.8rem] font-semibold leading-5 text-primary">
            {profile.levelLabel}
          </span>
        </div>
        <p className="mt-1 truncate text-[0.82rem] font-medium leading-5 text-muted-foreground">
          {profile.nextLevelLabel}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="다음 레벨 진행도"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={profile.progressPercent}
            className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${profile.progressPercent}%` }}
            />
          </div>
          <strong className="shrink-0 text-[0.82rem] font-semibold text-foreground">
            {profile.pointsLabel}
          </strong>
        </div>
      </div>
    </section>
  );
}

export { ProfileSummaryCard, type ProfileSummaryCardProps };

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
        <h2 className="truncate text-[1.3rem] font-bold leading-7 tracking-[-0.025em] text-foreground">
          {profile.nickname}
        </h2>
        <p className="mt-1 truncate text-[0.82rem] font-medium leading-5 text-muted-foreground">
          {profile.authLabel}
        </p>
      </div>
    </section>
  );
}

export { ProfileSummaryCard, type ProfileSummaryCardProps };

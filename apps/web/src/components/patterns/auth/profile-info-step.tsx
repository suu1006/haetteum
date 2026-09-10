import { ImageIcon } from "lucide-react";
import type { ChangeEvent } from "react";

import { AuthPrimaryButton } from "@/components/patterns/auth/auth-primary-button";
import { SelectableChip } from "@/components/patterns/auth/selectable-chip";

type ProfileOption = { value: string; label: string };

type ProfileInfoStepProps = {
  headingId: string;
  profilePhotoUrl: string | null;
  uploadingPhoto?: boolean;
  onPhotoSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  travelStyleOptions: ProfileOption[];
  selectedTravelStyles: string[];
  onToggleTravelStyle: (style: string) => void;
  regionOptions: ProfileOption[];
  selectedRegions: string[];
  onToggleRegion: (region: string) => void;
  regionQuery: string;
  onRegionQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string | null;
  submitting?: boolean;
  onSubmit: () => void;
};

function ProfileInfoStep({
  headingId,
  profilePhotoUrl,
  uploadingPhoto = false,
  onPhotoSelect,
  travelStyleOptions,
  selectedTravelStyles,
  onToggleTravelStyle,
  regionOptions,
  selectedRegions,
  onToggleRegion,
  regionQuery,
  onRegionQueryChange,
  error = null,
  submitting = false,
  onSubmit,
}: ProfileInfoStepProps) {
  return (
    <div className="pt-2">
      <h1
        id={headingId}
        className="max-w-[19rem] break-keep text-[1.5rem] leading-[1.35] font-bold tracking-[-0.04em] text-foreground"
      >
        추가 정보를 입력해주세요.
      </h1>
      <p className="mt-3 max-w-sm break-keep type-body-md leading-6 text-muted-foreground">
        더 나은 여행 경험을 위해 간단한 정보를 알려주세요.
      </p>

      <div className="mt-6">
        <p className="type-caption font-bold text-foreground">프로필 사진 (선택)</p>
        <div className="mt-2 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-14 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground"
          >
            {profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profilePhotoUrl} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon aria-hidden="true" className="size-6" />
            )}
          </span>
          <label className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-border px-4 type-caption font-semibold text-foreground outline-none focus-within:ring-3 focus-within:ring-ring/25">
            {uploadingPhoto ? "업로드 중..." : "사진 업로드"}
            <input
              type="file"
              accept="image/*"
              onChange={onPhotoSelect}
              disabled={uploadingPhoto}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      <div className="mt-6">
        <p className="type-caption font-bold text-foreground">여행 스타일 (선택)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {travelStyleOptions.map((style) => (
            <SelectableChip
              key={style.value}
              selected={selectedTravelStyles.includes(style.value)}
              onToggle={() => onToggleTravelStyle(style.value)}
            >
              {style.label}
            </SelectableChip>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="type-caption font-bold text-foreground">관심 지역 (선택)</p>
        <input
          type="text"
          placeholder="관심 지역을 검색해주세요."
          value={regionQuery}
          onChange={onRegionQueryChange}
          className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 type-caption text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {regionOptions.map((region) => {
            const selected = selectedRegions.includes(region.value);
            return (
              <SelectableChip
                key={region.value}
                variant="pill"
                selected={selected}
                onToggle={() => onToggleRegion(region.value)}
              >
                {region.label}
                {selected ? " ✓" : " +"}
              </SelectableChip>
            );
          })}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 type-caption text-destructive">
          {error}
        </p>
      ) : null}

      <AuthPrimaryButton
        onClick={onSubmit}
        loading={submitting}
        loadingLabel="저장 중..."
        className="mt-8"
      >
        회원가입 완료
      </AuthPrimaryButton>
    </div>
  );
}

export { ProfileInfoStep, type ProfileInfoStepProps };

"use client";

import type { FormEvent, ReactNode } from "react";
import { LightbulbIcon } from "lucide-react";

import { ReviewPhotoUpload } from "@/components/travel/review-photo-upload";
import { ReviewRatingInput } from "@/components/travel/review-rating-input";
import { Switch } from "@/components/ui/switch";

const REVIEW_EDITOR_FORM_ID = "review-editor-form";
const maxTitleLength = 30;
const minContentLength = 10;
const maxContentLength = 500;

type ReviewEditorFormProps = {
  placeSection: ReactNode;
  rating: number | null;
  title: string;
  content: string;
  images: string[];
  saveToFavorites: boolean;
  submitting: boolean;
  errorMessage: string | null;
  onRatingChange: (rating: number) => void;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onImagesChange: (images: string[]) => void;
  onSaveToFavoritesChange: (saveToFavorites: boolean) => void;
  onSubmit: () => void;
};

function ReviewEditorForm({
  placeSection,
  rating,
  title,
  content,
  images,
  saveToFavorites,
  submitting,
  errorMessage,
  onRatingChange,
  onTitleChange,
  onContentChange,
  onImagesChange,
  onSaveToFavoritesChange,
  onSubmit,
}: ReviewEditorFormProps) {
  const trimmedContent = content.trim();
  const contentTooShort =
    trimmedContent.length > 0 && trimmedContent.length < minContentLength;
  const contentTooLong = trimmedContent.length > maxContentLength;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form id={REVIEW_EDITOR_FORM_ID} className="grid gap-7" onSubmit={handleSubmit}>
      {placeSection}

      <fieldset className="grid gap-3" disabled={submitting}>
        <div>
          <legend className="type-body-lg font-semibold text-foreground">
            이곳은 어땠나요?
          </legend>
          <p className="type-caption mt-1 text-muted-foreground">
            별점을 선택해주세요.
          </p>
        </div>
        <ReviewRatingInput
          value={rating}
          onChange={onRatingChange}
          disabled={submitting}
        />
      </fieldset>

      <div className="grid gap-2">
        <label htmlFor="review-title" className="type-body-lg font-semibold text-foreground">
          제목을 입력해주세요
        </label>
        <div className="flex items-center gap-2 border-b border-input pb-2">
          <input
            id="review-title"
            value={title}
            disabled={submitting}
            maxLength={maxTitleLength}
            placeholder="예) 온천도 좋고 주변 경관도 아름다워요."
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-45"
            onChange={(event) => onTitleChange(event.target.value)}
          />
          <span className="type-caption shrink-0 text-muted-foreground">
            {title.length}/{maxTitleLength}
          </span>
        </div>
      </div>

      <div className="grid gap-2">
        <div>
          <label htmlFor="review-content" className="type-body-lg font-semibold text-foreground">
            후기를 작성해주세요
          </label>
          <p className="type-caption mt-1 text-muted-foreground">
            여행 경험과 느낌을 자유롭게 남겨주세요.
          </p>
        </div>
        <textarea
          id="review-content"
          value={content}
          disabled={submitting}
          aria-invalid={contentTooShort || contentTooLong}
          aria-describedby={
            contentTooShort || contentTooLong ? "review-content-error" : undefined
          }
          rows={7}
          className="min-h-40 w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-45"
          placeholder="최소 10자 이상 작성해주세요."
          onChange={(event) => onContentChange(event.target.value)}
        />
        <div className="flex items-center justify-between gap-4">
          {contentTooShort || contentTooLong ? (
            <p id="review-content-error" className="type-caption text-destructive">
              후기는 10자 이상 500자 이하로 작성해 주세요.
            </p>
          ) : (
            <span />
          )}
          <span
            aria-live="polite"
            className="type-caption shrink-0 text-muted-foreground"
          >
            {content.length}/{maxContentLength}
          </span>
        </div>
      </div>

      <div className="grid gap-2">
        <div>
          <p className="type-body-lg font-semibold text-foreground">
            사진을 추가해주세요 <span className="text-muted-foreground">(선택)</span>
          </p>
          <p className="type-caption mt-1 text-muted-foreground">
            최대 5장까지 등록할 수 있어요.
          </p>
        </div>
        <ReviewPhotoUpload
          images={images}
          onChange={onImagesChange}
          disabled={submitting}
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-6">
        <div>
          <p className="type-body-lg font-semibold text-foreground">북마크에 저장할까요?</p>
          <p className="type-caption mt-1 text-muted-foreground">
            이 장소를 북마크에 추가하면 나중에 쉽게 찾을 수 있어요.
          </p>
        </div>
        <Switch
          aria-label="북마크에 저장"
          checked={saveToFavorites}
          disabled={submitting}
          onCheckedChange={onSaveToFavoritesChange}
        />
      </div>

      <div className="flex gap-2.5 rounded-2xl bg-primary-subtle px-4 py-4 text-primary">
        <LightbulbIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <ul className="type-caption grid gap-1">
          <li>다른 사람에게 도움이 되는 솔직한 후기를 남겨주세요.</li>
          <li>욕설, 비방, 광고성 내용은 관리자에 의해 삭제될 수 있습니다.</li>
        </ul>
      </div>

      {errorMessage != null ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}

export { ReviewEditorForm, REVIEW_EDITOR_FORM_ID, type ReviewEditorFormProps };

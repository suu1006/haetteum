"use client";

import { Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";

import { uploadReviewImage } from "@/features/profile/review-images-api";
import { cn } from "@/lib/utils";

type ReviewPhotoUploadProps = {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
  maxCount?: number;
};

function ReviewPhotoUpload({
  images,
  onChange,
  disabled = false,
  maxCount = 5,
}: ReviewPhotoUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);
    const result = await uploadReviewImage(file);
    setUploading(false);

    if (result.status === "error") {
      setErrorMessage(result.message);
      return;
    }

    onChange([...images, result.url]);
  }

  function handleRemove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  const canAddMore = images.length < maxCount && !disabled;

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-4 gap-3">
        {canAddMore ? (
          <label
            htmlFor={inputId}
            className={cn(
              "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-primary/40 bg-primary-subtle text-primary outline-none transition-colors hover:bg-primary-subtle/70 has-focus-visible:ring-3 has-focus-visible:ring-ring/25",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            {uploading ? (
              <Loader2Icon className="size-6 animate-spin" aria-hidden="true" />
            ) : (
              <PlusIcon className="size-6" aria-hidden="true" />
            )}
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              aria-label="사진 추가"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading || disabled}
              onChange={(event) => void handleFileSelected(event)}
            />
          </label>
        ) : null}

        {images.map((url, index) => (
          <div
            key={url}
            className="relative aspect-square overflow-hidden rounded-2xl bg-secondary"
          >
            <Image
              src={url}
              alt={`첨부 사진 ${index + 1}`}
              fill
              sizes="120px"
              className="object-cover"
            />
            <button
              type="button"
              aria-label={`사진 ${index + 1} 삭제`}
              disabled={disabled}
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-foreground/60 text-background outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              <XIcon className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      {errorMessage != null ? (
        <p role="alert" className="type-caption text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

export { ReviewPhotoUpload, type ReviewPhotoUploadProps };

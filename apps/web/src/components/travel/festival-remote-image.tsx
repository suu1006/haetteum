"use client";

import { useState } from "react";
import Image from "next/image";
import { PartyPopperIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type FestivalRemoteImageProps = {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  loading?: "eager" | "lazy";
  draggable?: boolean;
  unoptimized?: boolean;
  fetchPriority?: "high" | "low" | "auto";
};

function FestivalRemoteImage({
  src,
  alt,
  sizes,
  className,
  loading,
  fetchPriority,
  draggable = false,
  unoptimized = false,
}: FestivalRemoteImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = src != null && failedSrc === src;

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        data-image-state="placeholder"
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-subtle via-muted to-secondary-subtle text-primary",
          className,
        )}
      >
        <PartyPopperIcon aria-hidden="true" className="size-8 opacity-75" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading={loading}
      fetchPriority={fetchPriority}
      draggable={draggable}
      unoptimized={unoptimized}
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}

export { FestivalRemoteImage, type FestivalRemoteImageProps };

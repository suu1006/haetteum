"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type FestivalIntroductionProps = {
  title?: string;
  introduction: string;
};

function FestivalIntroduction({
  title = "축제 소개",
  introduction,
}: FestivalIntroductionProps) {
  const headingId = useId();
  const introductionRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useLayoutEffect(() => {
    if (expanded || !introductionRef.current) return;
    const { clientHeight, scrollHeight } = introductionRef.current;
    setHasOverflow(scrollHeight > clientHeight);
  }, [expanded, introduction]);

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="type-title-md text-foreground">
        {title}
      </h2>
      <p
        ref={introductionRef}
        className={`type-body mt-3 whitespace-pre-line text-muted-foreground ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        {introduction}
      </p>
      {hasOverflow ? (
        <Button
          type="button"
          variant="ghost"
          className="mt-2 h-11 px-2 text-primary"
          aria-label={expanded ? `${title} 접기` : `${title} 더보기`}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "접기" : "더보기"}
          {expanded ? (
            <ChevronUpIcon aria-hidden="true" />
          ) : (
            <ChevronDownIcon aria-hidden="true" />
          )}
        </Button>
      ) : null}
    </section>
  );
}

export { FestivalIntroduction, type FestivalIntroductionProps };

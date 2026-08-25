"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type FestivalIntroductionProps = {
  introduction: string;
};

function FestivalIntroduction({ introduction }: FestivalIntroductionProps) {
  const introductionRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useLayoutEffect(() => {
    if (expanded || !introductionRef.current) return;
    const { clientHeight, scrollHeight } = introductionRef.current;
    setHasOverflow(scrollHeight > clientHeight);
  }, [expanded, introduction]);

  return (
    <section aria-labelledby="festival-introduction-title">
      <h2 id="festival-introduction-title" className="type-title-md text-foreground">
        축제 소개
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
          aria-label={expanded ? "축제 소개 접기" : "축제 소개 더보기"}
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

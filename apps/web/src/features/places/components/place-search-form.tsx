"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";

import { SearchBar } from "@/components/patterns/search-bar/search-bar";
import type { DiscoveryQuery } from "@/features/discovery/discovery-model";
import { searchPlaces } from "@/features/places/place-search-api";

const SUGGESTION_DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 8;

export function PlaceSearchForm({
  query,
  action = "/explore",
}: {
  query: DiscoveryQuery;
  action?: "/" | "/explore";
}) {
  const id = action === "/explore" ? "explore-search" : "discovery-search";
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<{
    text: string;
    titles: string[];
  } | null>(null);
  const trimmed = text.trim();

  useEffect(() => {
    if (!trimmed) return;
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      void searchPlaces(undefined, trimmed).then((response) => {
        if (cancelled || response.status !== "ready") return;
        const titles = [...new Set(response.items.map((item) => item.title))];
        setSuggestions({
          text: trimmed,
          titles: titles.slice(0, MAX_SUGGESTIONS),
        });
      });
    }, SUGGESTION_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [trimmed]);

  // 입력값과 일치하는 응답만 보여 줘서 이전 검색어의 제안이 남지 않게 한다.
  const titles =
    trimmed && suggestions?.text === trimmed ? suggestions.titles : [];

  function suggestionHref(title: string) {
    const params = new URLSearchParams({
      q: title,
      reelRegion: query.reelRegion,
    });
    if (action === "/") params.set("tab", "recommended");
    return `${action}?${params}`;
  }

  return (
    <div
      className="relative"
      onInput={(event) => {
        if (event.target instanceof HTMLInputElement) {
          setText(event.target.value);
        }
      }}
    >
      <SearchBar
        id={id}
        label="여행지 검색"
        action={action}
        defaultValue={query.q}
      >
        <input type="hidden" name="reelRegion" value={query.reelRegion} />
        {action === "/" && (
          <input type="hidden" name="tab" value="recommended" />
        )}
      </SearchBar>
      {titles.length > 0 && (
        <ul
          aria-label="관련 검색어"
          className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-card py-1 shadow-lg"
        >
          {titles.map((title) => (
            <li key={title}>
              <Link
                href={suggestionHref(title)}
                onClick={() => setText("")}
                className="type-body-md flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted"
              >
                <SearchIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="truncate">{title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

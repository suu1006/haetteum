import Link from "next/link";
import type { IconType } from "react-icons";
import {
  TbCalendarMonth,
  TbHome,
  TbMessageDots,
  TbSearch,
  TbUser,
} from "react-icons/tb";

import { cn } from "@/lib/utils";

type BottomNavigationItem = {
  id: "home" | "explore" | "trips" | "reviews" | "profile";
  label: string;
  href?: string;
  current?: boolean;
};

type BottomNavigationProps = {
  items: readonly BottomNavigationItem[];
  variant?: "default" | "festival";
};

const navigationIcons: Record<BottomNavigationItem["id"], IconType> = {
  home: TbHome,
  explore: TbSearch,
  trips: TbCalendarMonth,
  reviews: TbMessageDots,
  profile: TbUser,
};

const itemClassName =
  "type-caption flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-muted-foreground transition-colors aria-[current=page]:text-primary";

function BottomNavigation({
  items,
  variant = "default",
}: BottomNavigationProps) {
  return (
    <nav aria-label="주요 메뉴" className="border-t border-border bg-card">
      <ul
        className={cn(
          "mx-auto grid max-w-screen-sm grid-cols-5 gap-1 px-3 py-1.5",
          variant === "festival" && "py-2",
        )}
      >
        {items.map((item) => {
          const Icon = navigationIcons[item.id];
          const content = (
            <>
              <Icon className="size-5" aria-hidden="true" strokeWidth={1.7} />
              <span className="truncate">{item.label}</span>
            </>
          );

          return (
            <li key={item.id} className="min-w-0">
              {item.href ? (
                <Link
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  className={cn(
                    itemClassName,
                    variant === "festival" &&
                      "text-[0.68rem] [&_svg]:size-6 aria-[current=page]:after:mt-0.5 aria-[current=page]:after:size-1 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-primary",
                    "hover:bg-primary-subtle hover:text-primary",
                  )}
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className={cn(
                    itemClassName,
                    variant === "festival" && "text-[0.68rem] [&_svg]:size-6",
                    "opacity-70",
                  )}
                >
                  {content}
                  <span className="sr-only">준비 중</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export {
  BottomNavigation,
  type BottomNavigationItem,
  type BottomNavigationProps,
};

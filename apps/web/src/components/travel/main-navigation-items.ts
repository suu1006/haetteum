import type { BottomNavigationItem } from "@/components/travel/bottom-navigation";

type MainNavigationVariant = "default" | "compact";

function createMainNavigationItems(
  current: BottomNavigationItem["id"],
  variant: MainNavigationVariant = "default",
): BottomNavigationItem[] {
  const compact = variant === "compact";

  return [
    { id: "home", label: "홈", href: "/", current: current === "home" },
    {
      id: "explore",
      label: "탐색",
      href: "/explore",
      current: current === "explore",
    },
    {
      id: "trips",
      label: compact ? "일정" : "내 일정",
      href: "/trips",
      current: current === "trips",
    },
    {
      id: "reviews",
      label: compact ? "후기" : "내 후기",
      href: "/reviews",
      current: current === "reviews",
    },
    {
      id: "profile",
      label: compact ? "마이" : "마이페이지",
      href: "/mypage",
      current: current === "profile",
    },
  ];
}

export { createMainNavigationItems, type MainNavigationVariant };

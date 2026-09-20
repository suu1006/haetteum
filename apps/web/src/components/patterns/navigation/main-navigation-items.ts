import type { BottomNavigationItem } from "@/components/patterns/navigation/bottom-navigation";

function createMainNavigationItems(
  current: BottomNavigationItem["id"],
): BottomNavigationItem[] {
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
      label: "내 일정",
      href: "/trips",
      current: current === "trips",
    },
    {
      id: "reviews",
      label: "내 후기",
      href: "/reviews",
      current: current === "reviews",
    },
    {
      id: "profile",
      label: "마이페이지",
      href: "/mypage",
      current: current === "profile",
    },
  ];
}

export { createMainNavigationItems };

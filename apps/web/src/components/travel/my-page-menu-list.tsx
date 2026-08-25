import type { IconType } from "react-icons";
import {
  TbBell,
  TbChevronRight,
  TbHeadset,
  TbInfoCircle,
  TbLogout2,
  TbSettings,
} from "react-icons/tb";

import type { MyPageMenuItem } from "@/features/profile/my-page-model";
import { cn } from "@/lib/utils";

type MyPageMenuListProps = {
  items: readonly MyPageMenuItem[];
};

const menuIcons: Record<MyPageMenuItem["id"], IconType> = {
  notifications: TbBell,
  settings: TbSettings,
  support: TbHeadset,
  guide: TbInfoCircle,
  logout: TbLogout2,
};

function MyPageMenuList({ items }: MyPageMenuListProps) {
  return (
    <section aria-label="계정 메뉴" className="rounded-[1.5rem] bg-card px-5 shadow-floating">
      <ul aria-label="마이페이지 메뉴">
        {items.map((item, index) => {
          const Icon = menuIcons[item.id];
          const isLast = index === items.length - 1;

          return (
            <li
              key={item.id}
              className={cn(
                "flex h-[3.125rem] items-center gap-3",
                !isLast && "border-b border-border/80",
              )}
            >
              <Icon
                aria-hidden="true"
                className="size-6 shrink-0 text-muted-foreground"
                strokeWidth={1.65}
              />
              <span className="text-[0.9rem] font-semibold text-foreground">
                {item.label}
              </span>
              {item.hasNotice ? (
                <>
                  <span className="sr-only">새 알림 있음</span>
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-red-600"
                  />
                </>
              ) : null}
              {item.id !== "logout" ? (
                <TbChevronRight
                  aria-hidden="true"
                  className="ml-auto size-5 text-muted-foreground"
                  strokeWidth={1.7}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export { MyPageMenuList, type MyPageMenuListProps };

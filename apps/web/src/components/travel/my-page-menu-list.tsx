"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { logout } from "@/features/auth/auth-client";
import { useAuthStore } from "@/features/auth/auth-store";
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
  const router = useRouter();
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const [logoutStatus, setLogoutStatus] = useState<
    "idle" | "pending" | "error"
  >("idle");

  async function handleLogout() {
    setLogoutStatus("pending");
    try {
      await logout();
      setAnonymous();
      router.replace("/");
      router.refresh();
    } catch {
      setLogoutStatus("error");
    }
  }

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
              {item.id === "logout" ? (
                <button
                  type="button"
                  aria-label={
                    logoutStatus === "error" ? "로그아웃 다시 시도" : item.label
                  }
                  disabled={logoutStatus === "pending"}
                  onClick={handleLogout}
                  className="flex min-h-11 flex-1 items-center text-left text-[0.9rem] font-semibold text-foreground outline-none disabled:opacity-60 focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  {logoutStatus === "pending" ? "로그아웃 중" : item.label}
                </button>
              ) : (
                <span className="text-[0.9rem] font-semibold text-foreground">
                  {item.label}
                </span>
              )}
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
      {logoutStatus === "error" ? (
        <p
          role="alert"
          className="border-t border-border/80 py-3 type-caption text-destructive"
        >
          로그아웃하지 못했어요. 다시 시도해 주세요.
        </p>
      ) : null}
    </section>
  );
}

export { MyPageMenuList, type MyPageMenuListProps };

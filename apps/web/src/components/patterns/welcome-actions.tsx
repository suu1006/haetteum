import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WelcomeActionsProps {
  className?: string;
  desktop?: boolean;
}

function WelcomeActions({
  className,
  desktop = false,
}: WelcomeActionsProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Link
        className={buttonVariants({
          className: "w-full rounded-xl shadow-floating",
          size: "lg",
        })}
        href="/"
      >
        여행 시작하기
      </Link>
      <Link
        className={cn(
          buttonVariants({ variant: desktop ? "outline" : "ghost" }),
          "w-full text-white hover:bg-white/10 hover:text-white disabled:opacity-90",
          desktop && "border-white/80 bg-black/10",
        )}
        href="/login"
      >
        로그인
      </Link>
    </div>
  );
}

export { WelcomeActions };

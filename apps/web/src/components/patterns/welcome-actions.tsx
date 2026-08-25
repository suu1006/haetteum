import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
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
      <Button
        className={cn(
          "w-full text-white hover:bg-white/10 hover:text-white disabled:opacity-90",
          desktop && "border-white/80 bg-black/10",
        )}
        disabled
        variant={desktop ? "outline" : "ghost"}
      >
        로그인
      </Button>
    </div>
  );
}

export { WelcomeActions };

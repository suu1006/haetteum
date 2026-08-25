import type { ReactNode } from "react";
import { MessageCircleMore, Route } from "lucide-react";

import { cn } from "@/lib/utils";

type WelcomeChatTone = "assistant" | "traveler";

interface WelcomeChatMessageProps {
  children: ReactNode;
  className?: string;
  emphasized?: boolean;
  time: string;
  tone: WelcomeChatTone;
}

function WelcomeChatMessage({
  children,
  className,
  emphasized = false,
  time,
  tone,
}: WelcomeChatMessageProps) {
  const isRightAligned = tone === "traveler";
  const Icon = isRightAligned ? Route : MessageCircleMore;
  const avatar = (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border-4 border-white bg-white shadow-card",
        isRightAligned ? "text-welcome-course" : "text-welcome-reviews",
      )}
    >
      <Icon className="size-6" strokeWidth={2.5} />
    </span>
  );
  const timestamp = (
    <time className="pb-2 text-xs tabular-nums text-white/75">{time}</time>
  );

  return (
    <li
      className={cn(
        "flex items-end gap-3",
        isRightAligned ? "justify-end" : "justify-start",
        className,
      )}
    >
      {isRightAligned && timestamp}
      {!isRightAligned && avatar}
      <div
        className={cn(
          "max-w-[24rem] rounded-2xl px-5 py-2.5 text-sm leading-5 text-foreground shadow-floating",
          isRightAligned
            ? "rounded-tr-sm bg-welcome-chat-user"
            : "rounded-tl-sm bg-welcome-chat-assistant",
          emphasized && "w-full max-w-[22.5rem] px-6 py-4",
        )}
      >
        {children}
      </div>
      {isRightAligned && avatar}
      {!isRightAligned && timestamp}
    </li>
  );
}

export { WelcomeChatMessage };
export type { WelcomeChatMessageProps, WelcomeChatTone };

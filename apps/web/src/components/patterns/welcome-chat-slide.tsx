import { Ellipsis } from "lucide-react";

import { WelcomeDesktopConversation } from "@/components/patterns/welcome-desktop-conversation";

interface WelcomeChatSlideProps {
  showLoading: boolean;
  visibleMessageCount: number;
}

function WelcomeChatSlide({
  showLoading,
  visibleMessageCount,
}: WelcomeChatSlideProps) {
  return (
    <section aria-label="여행 대화와 AI 코스 준비">
      <WelcomeDesktopConversation visibleCount={visibleMessageCount} />
      {showLoading && (
        <div
          className="mt-6 flex animate-[welcome-chat-in_var(--motion-welcome-chat)_var(--ease-standard)_both] items-center justify-center gap-4 motion-reduce:animate-none"
          role="status"
        >
          <span
            aria-hidden="true"
            className="flex h-11 w-24 items-center justify-center rounded-2xl bg-primary/80 text-white shadow-floating backdrop-blur-md"
          >
            <Ellipsis className="size-7 animate-pulse" strokeWidth={2.8} />
          </span>
          <span className="text-sm text-white/75">
            해뜸이 코스를 준비하고 있어요
          </span>
        </div>
      )}
    </section>
  );
}

export { WelcomeChatSlide };
export type { WelcomeChatSlideProps };

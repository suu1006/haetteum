import { WelcomeChatMessage } from "@/components/patterns/welcome-chat-message";

const welcomeMessages = [
  {
    content: "오늘 우리 어디 놀러갈까?",
    time: "10:30",
    tone: "assistant" as const,
  },
  {
    content: "좋지 근데 어디갈까? 😊",
    time: "10:31",
    tone: "traveler" as const,
  },
  {
    content: "이천에 있는 온천 어때? ♨️",
    time: "10:32",
    tone: "assistant" as const,
  },
  {
    content: "그럼 근처 밥집에서 밥 먹을까? 🍚",
    time: "10:33",
    tone: "traveler" as const,
  },
  {
    content: "누가 코스 좀 짜줬으면 좋겠다 ㅠㅠ",
    time: "10:34",
    tone: "assistant" as const,
  },
] as const;

interface WelcomeDesktopConversationProps {
  visibleCount: number;
}

function WelcomeDesktopConversation({
  visibleCount,
}: WelcomeDesktopConversationProps) {
  return (
    <ol
      aria-live="polite"
      aria-label="여행 계획 대화"
      aria-relevant="additions"
      className="hidden list-none gap-6 p-0 lg:grid"
    >
      {welcomeMessages.slice(0, visibleCount).map((message) => (
        <WelcomeChatMessage
          className="animate-[welcome-chat-in_var(--motion-welcome-chat)_var(--ease-standard)_both] motion-reduce:animate-none"
          key={message.time}
          time={message.time}
          tone={message.tone}
        >
          {message.content}
        </WelcomeChatMessage>
      ))}
    </ol>
  );
}

export { WelcomeDesktopConversation };
export type { WelcomeDesktopConversationProps };

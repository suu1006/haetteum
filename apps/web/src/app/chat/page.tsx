"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, ArrowUpIcon, LoaderCircleIcon, RefreshCwIcon } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { CHAT_MAX_QUESTION_CHARS, selectChatContext, type ChatMessage } from "@haetteum/contracts";

import { ChatRequestError, readChatStream, toChatRequestError } from "@/features/chat/read-chat-stream";

import { createSmoothChatText } from "@/features/chat/smooth-chat-text";
import { getApiBaseUrl } from "@/lib/api-base";

const ChatMarkdown = memo(function ChatMarkdown({ content }: { content: string }) {
  return <ReactMarkdown>{content}</ReactMarkdown>;
});

const suggestions = ["서울 당일치기 코스 추천해줘", "제주에서 가볼 만한 곳 알려줘", "가족과 함께할 여행 추천해줘"];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ChatRequestError | null>(null);
  const pending = useRef(false);
  const conversation = useRef<HTMLElement>(null);
  const followBottom = useRef(true);
  const requestAbort = useRef<AbortController | null>(null);
  const retryMessages = useRef<ChatMessage[]>([]);
  const retryRequestId = useRef<string | undefined>(undefined);

  useEffect(() => () => requestAbort.current?.abort(), []);

  useEffect(() => {
    const element = conversation.current;
    if (element && followBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages, sending, error]);

  async function send(nextMessages: ChatMessage[], requestId = crypto.randomUUID()) {
    if (pending.current) return;
    pending.current = true;
    setSending(true);
    setError(null);
    retryMessages.current = nextMessages;
    retryRequestId.current = requestId;
    setMessages(nextMessages);
    const abort = new AbortController();
    requestAbort.current = abort;
    followBottom.current = true;
    const smooth = createSmoothChatText((text) => {
      if (!abort.signal.aborted) setMessages([...nextMessages, { role: "assistant", content: text }]);
    });
    abort.signal.addEventListener("abort", smooth.cancel, { once: true });
    const timeout = AbortSignal.timeout(60_000);
    try {
      const baseUrl = getApiBaseUrl();
      if (!baseUrl) throw new ChatRequestError(503);
      const response = await fetch(`${baseUrl}/chat/messages/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, messages: selectChatContext(nextMessages) }),
        signal: AbortSignal.any([abort.signal, timeout]),
      });
      await readChatStream(response, smooth.push);
      await smooth.finish();
    } catch (cause) {
      const failure = cause instanceof ChatRequestError ? cause : timeout.aborted ? new ChatRequestError(504) : toChatRequestError(cause);
      await smooth.finish();
      if (!abort.signal.aborted) {
        setError(failure);
        if (failure.status === 400) {
          setDraft(nextMessages.at(-1)?.content ?? "");
          setMessages(nextMessages.slice(0, -1));
        }
      }
    } finally {
      smooth.cancel();
      abort.signal.removeEventListener("abort", smooth.cancel);
      pending.current = false;
      setSending(false);
    }
  }

  function submit(content: string) {
    if (!content.trim() || content.trim().length > CHAT_MAX_QUESTION_CHARS || pending.current || error) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: content.trim() }];
    setMessages(nextMessages);
    setDraft("");
    void send(nextMessages);
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[30rem] flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link href="/" aria-label="홈으로 돌아가기" className="flex size-11 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeftIcon className="size-5" aria-hidden="true" />
        </Link>
        <Image src="/images/haetteum-chatbot-icon.svg" alt="" width={40} height={40} className="rounded-full" unoptimized />
        <div>
          <h1 className="text-base font-bold">해뜸 여행 도우미</h1>
          <p className="text-xs text-muted-foreground">함께 계획하는 나만의 여행</p>
        </div>
      </header>

      <section ref={conversation} onScroll={(event) => {
        const element = event.currentTarget;
        followBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 64;
      }} aria-label="대화 내용" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-center py-6">
            <Image src="/images/haetteum-chatbot-icon.svg" alt="해뜸 여행 도우미" width={96} height={96} className="mb-5 rounded-full self-start" unoptimized />
            <h2 className="text-2xl leading-snug font-bold tracking-tight">어떤 여행을 꿈꾸세요?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">가고 싶은 곳이나 함께할 사람을 알려주세요.<br />해뜸이 여행 계획을 도와드릴게요.</p>
            <div className="mt-7 flex flex-col items-start gap-2">
              {suggestions.map((question) => (
                <button key={question} type="button" onClick={() => submit(question)} className="min-h-11 rounded-2xl border border-primary/15 bg-card px-4 py-3 text-left text-sm text-primary outline-none transition-colors hover:bg-primary-subtle focus-visible:ring-2 focus-visible:ring-ring">{question}</button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="space-y-5">
            {messages.map((message, index) => (
              <li key={index} className={message.role === "user" ? "flex justify-end" : ""}>
                {message.role === "user" ? (
                  <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-6 whitespace-pre-wrap text-primary-foreground [overflow-wrap:anywhere]">{message.content}</p>
                ) : (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Image
                        src="/images/haetteum-chatbot-icon.svg"
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 shrink-0 rounded-full bg-white"
                        unoptimized
                      />
                      <p className="text-xs font-semibold text-primary">해뜸</p>
                    </div>
                    <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm leading-7 [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_h1]:my-3 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:my-3 [&_h2]:font-bold [&_h3]:my-2 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5">
                      <ChatMarkdown content={message.content} />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {sending ? <p className="mt-5 flex items-center gap-2"><LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />{messages.at(-1)?.role === "assistant" ? "답변을 작성하고 있어요…" : "여행을 생각하고 있어요…"}</p> : messages.at(-1)?.role === "assistant" ? <span className="sr-only">새 답변이 도착했어요.</span> : null}
        </div>
        {error ? (
          <div className="mt-5 rounded-2xl border border-border bg-card p-4">
            <p role="alert" className="text-sm leading-6 text-muted-foreground">{error.message}</p>
            {error.status === 401 ? <Link href="/login?returnTo=%2Fchat" className="mt-2 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary outline-none hover:bg-primary-subtle focus-visible:ring-2 focus-visible:ring-ring">로그인하기</Link> : null}
            {error.retryable ? <button type="button" onClick={() => void send(retryMessages.current, retryRequestId.current)} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary outline-none hover:bg-primary-subtle focus-visible:ring-2 focus-visible:ring-ring"><RefreshCwIcon aria-hidden="true" className="size-4" />다시 시도</button> : null}
          </div>
        ) : null}
      </section>

      <footer className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[calc(0.75rem+var(--safe-area-bottom))]">
        <form onSubmit={(event) => { event.preventDefault(); submit(draft); }} className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pr-1 pl-3 focus-within:border-primary">
          <textarea aria-label="여행 질문" placeholder="어떤 여행을 떠나고 싶으세요?" rows={1} maxLength={CHAT_MAX_QUESTION_CHARS} value={draft} onChange={(event) => { setDraft(event.target.value); if (error?.status === 400) setError(null); }} onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(draft); }
          }} className="min-w-0 flex-1 resize-none bg-transparent py-1.5 text-base leading-5 outline-none placeholder:text-muted-foreground" />
          <button type="submit" aria-label="메시지 보내기" disabled={sending || !!error || !draft.trim()} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40">
            {sending ? <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <ArrowUpIcon aria-hidden="true" className="size-4" />}
          </button>
        </form>
        <p className="mt-2 text-center text-[0.65rem] leading-4 text-muted-foreground">AI 답변은 실제 정보와 다를 수 있어요. 방문 전 확인해 주세요.</p>
      </footer>
    </main>
  );
}

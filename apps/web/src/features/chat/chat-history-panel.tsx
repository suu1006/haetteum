"use client";

import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { ChatConversationSummary } from "@haetteum/contracts";

import { listChatConversations } from "@/features/chat/chat-history-api";

type ChatHistoryPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (conversationId: string) => void;
};

type LoadState = "idle" | "loading" | "ready" | "error";

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(iso));
}

function ChatHistoryPanel({ open, onOpenChange, onSelectConversation }: ChatHistoryPanelProps) {
  const [items, setItems] = useState<ChatConversationSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>("idle");

  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      setState("loading");
      listChatConversations()
        .then((response) => {
          setItems(response.items);
          setNextCursor(response.nextCursor);
          setState("ready");
        })
        .catch(() => setState("error"));
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [open]);

  function loadMore() {
    if (nextCursor === null) return;
    setState("loading");
    listChatConversations(nextCursor)
      .then((response) => {
        setItems((current) => [...current, ...response.items]);
        setNextCursor(response.nextCursor);
        setState("ready");
      })
      .catch(() => setState("error"));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-180 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-stretch justify-end">
          <Dialog.Popup className="relative flex h-dvh w-[85%] max-w-sm flex-col overflow-hidden border-l border-white/70 bg-card text-foreground shadow-floating outline-none transition-[transform,opacity] duration-180 data-ending-style:translate-x-2 data-ending-style:opacity-0 data-starting-style:translate-x-2 data-starting-style:opacity-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 pt-[calc(1.25rem+var(--safe-area-top))] pb-4">
              <Dialog.Title className="type-title-md text-foreground">대화 목록</Dialog.Title>
              <Dialog.Close
                aria-label="닫기"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                <XIcon aria-hidden="true" className="size-5" />
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
              {state === "error" && items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background px-5 py-10 text-center">
                  <p role="alert" className="type-caption text-destructive">
                    대화 목록을 불러오지 못했어요.
                  </p>
                </div>
              ) : items.length === 0 && state !== "loading" ? (
                <p className="type-caption text-muted-foreground">아직 나눈 대화가 없어요.</p>
              ) : (
                <ul aria-label="과거 대화 목록" className="grid gap-2">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Dialog.Close
                        render={
                          <button type="button">
                            <span className="min-w-0 flex-1 text-left">
                              <span className="type-label block truncate text-foreground">{item.title}</span>
                              <span className="type-caption mt-0.5 block truncate text-muted-foreground">
                                {item.preview}
                              </span>
                            </span>
                            <span className="type-caption shrink-0 text-muted-foreground">
                              {formatUpdatedAt(item.updatedAt)}
                            </span>
                          </button>
                        }
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left outline-none transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/25"
                        onClick={() => onSelectConversation(item.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {state === "loading" ? (
                <p className="type-caption mt-3 text-muted-foreground">불러오는 중...</p>
              ) : null}
              {nextCursor !== null && state !== "loading" ? (
                <button
                  type="button"
                  onClick={loadMore}
                  className="mt-3 min-h-11 w-full rounded-xl border border-border py-2 text-sm font-semibold text-primary outline-none hover:bg-primary-subtle focus-visible:ring-2 focus-visible:ring-ring"
                >
                  더 보기
                </button>
              ) : null}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { ChatHistoryPanel, type ChatHistoryPanelProps };

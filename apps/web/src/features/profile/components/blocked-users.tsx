"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BlockedUsersResponse } from "@haetteum/contracts";
import { Button } from "@/components/ui/button/button";
import { mutateModeration } from "@/features/reviews/moderation-api";

export function BlockedUsers({ items }: BlockedUsersResponse) {
  const router = useRouter();
  const [removed, setRemoved] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const visible = items.filter((item) => !removed.includes(item.userId));
  async function unblock(userId: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(userId);
    setError("");
    setMessage("");
    try {
      await mutateModeration(
        `/user-blocks/${encodeURIComponent(userId)}`,
        "DELETE",
      );
      setRemoved((values) => [...values, userId]);
      setMessage("차단을 해제했어요.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }
  return (
    <section aria-label="차단한 사용자" className="space-y-4">
      <p className="type-body-md text-muted-foreground">
        차단한 사용자의 후기는 내 화면에 표시되지 않아요. 차단을 해제하면 다시
        볼 수 있어요.
      </p>
      {visible.length === 0 ? (
        <p className="py-10 text-center">차단한 사용자가 없어요.</p>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((item) => (
            <li
              key={item.userId}
              className="flex items-center justify-between gap-3 py-4"
            >
              <span className="min-w-0 break-words font-medium">
                {item.displayName}
              </span>
              <Button
                variant="outline"
                disabled={pending !== null}
                aria-label={`${item.displayName} 차단 해제`}
                onClick={() => void unblock(item.userId)}
              >
                {pending === item.userId ? "해제 중…" : "차단 해제"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

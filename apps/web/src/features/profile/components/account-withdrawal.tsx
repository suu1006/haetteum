"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button/button";
import { deleteAccount } from "@/features/auth/auth-client";
import { useAuthStore } from "@/features/auth/auth-store";

export function AccountWithdrawal() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const submitting = useRef(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAnonymous = useAuthStore((state) => state.setAnonymous);

  async function withdraw() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(false);
    try {
      await deleteAccount();
    } catch {
      setError(true);
      setPending(false);
      submitting.current = false;
      return;
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    setAnonymous();
    setOpen(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <Modal.Root
      open={open}
      onOpenChange={(next) => {
        if (submitting.current) return;
        setError(false);
        setOpen(next);
      }}
    >
      <Modal.Trigger className="flex min-h-11 flex-1 items-center text-left text-[0.9rem] font-semibold text-destructive outline-none focus-visible:ring-3 focus-visible:ring-ring/25">
        회원탈퇴
      </Modal.Trigger>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Viewport className="items-center p-5">
          <Modal.Popup className="max-w-sm rounded-2xl p-6">
            <Modal.Title className="text-lg font-bold">
              탈퇴하시겠습니까?
            </Modal.Title>
            <Modal.Description className="mt-3 text-sm leading-6 text-muted-foreground">
              회원 탈퇴 시 모든 개인정보가 삭제됩니다. 정말로 탈퇴하시겠어요?
            </Modal.Description>
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                회원탈퇴를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2" aria-busy={pending}>
              <Modal.Close
                render={<Button variant="outline" disabled={pending} />}
              >
                취소
              </Modal.Close>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => void withdraw()}
              >
                {pending ? "탈퇴 처리 중…" : "회원탈퇴"}
              </Button>
            </div>
          </Modal.Popup>
        </Modal.Viewport>
      </Modal.Portal>
    </Modal.Root>
  );
}

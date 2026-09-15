"use client";

import { Fragment } from "react";
import { XIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button/button";
import {
  legalContactEmail,
  legalDocuments,
} from "@/features/profile/legal-documents";
import { cn } from "@/lib/utils";

export function MyPageLegalLinks() {
  return (
    <footer
      aria-label="서비스 정책"
      className="flex items-center justify-center gap-2 pb-2 text-xs text-muted-foreground"
    >
      {legalDocuments.map((document, index) => (
        <Fragment key={document.id}>
          {index > 0 && <span aria-hidden="true">|</span>}
          <Modal.Root>
            <Modal.Trigger
              className={cn(
                "min-h-11 rounded-md px-1 underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/25",
                document.id === "privacy" && "font-semibold",
              )}
            >
              {document.title}
            </Modal.Trigger>
            <Modal.Portal>
              <Modal.Backdrop />
              <Modal.Viewport className="items-center p-4 sm:p-6">
                <Modal.Popup className="flex max-h-[85dvh] max-w-lg flex-col overflow-hidden rounded-2xl">
                  <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
                    <Modal.Title className="text-lg font-bold">
                      {document.title}
                    </Modal.Title>
                    <Modal.Close
                      aria-label={`${document.title} 닫기`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                    >
                      <XIcon aria-hidden="true" className="size-5" />
                    </Modal.Close>
                  </header>
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label={`${document.title} 내용`}
                    className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/25"
                  >
                    <Modal.Description className="text-muted-foreground">
                      {document.description}
                    </Modal.Description>
                    <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
                      검토 중인 초안입니다. 운영자 정보, 보관 기간 및 시행일
                      확정 후 정식 문서로 안내합니다.
                    </p>
                    <div className="mt-6 space-y-6">
                      {document.sections.map((section) => (
                        <section key={section.title}>
                          <h3 className="mb-2 font-semibold">
                            {section.title}
                          </h3>
                          <div className="space-y-2 text-muted-foreground">
                            {section.paragraphs.map((paragraph) => (
                              <p key={paragraph}>{paragraph}</p>
                            ))}
                          </div>
                        </section>
                      ))}
                      <p className="border-t border-border pt-4">
                        문의:{" "}
                        <a
                          href={`mailto:${legalContactEmail}`}
                          className="break-all font-medium text-foreground underline underline-offset-4"
                        >
                          {legalContactEmail}
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 border-t border-border p-4">
                    <Modal.Close
                      render={<Button variant="outline" className="w-full" />}
                    >
                      닫기
                    </Modal.Close>
                  </div>
                </Modal.Popup>
              </Modal.Viewport>
            </Modal.Portal>
          </Modal.Root>
        </Fragment>
      ))}
    </footer>
  );
}

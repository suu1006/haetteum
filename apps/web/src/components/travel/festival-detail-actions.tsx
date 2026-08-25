"use client";

import { useState } from "react";
import { CalendarPlusIcon, NavigationIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

function FestivalDetailActions() {
  const [status, setStatus] = useState("");

  return (
    <aside className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[30rem] border-t border-border bg-card px-4 pt-3 shadow-overlay">
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-[52px] flex-1"
          onClick={() => setStatus("일정 추가는 준비 중인 기능이에요")}
        >
          <CalendarPlusIcon aria-hidden="true" />
          일정에 추가
        </Button>
        <Button
          type="button"
          className="h-[52px] flex-1"
          onClick={() => setStatus("길찾기는 준비 중인 기능이에요")}
        >
          <NavigationIcon aria-hidden="true" />
          길찾기
        </Button>
      </div>
      {status ? (
        <p role="status" className="type-caption py-2 text-center text-primary">
          {status}
        </p>
      ) : null}
    </aside>
  );
}

export { FestivalDetailActions };

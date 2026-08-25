"use client";

import { SquarePenIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

function PlaceDetailActions() {
  const [message, setMessage] = useState("");

  return (
    <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[30rem] px-4 pb-4">
      <div className="flex justify-center">
        <Button
          type="button"
          size="lg"
          className="h-13 rounded-full px-8 shadow-floating"
          onClick={() => setMessage("후기 작성 기능을 준비하고 있어요")}
        >
          <SquarePenIcon aria-hidden="true" />
          후기 작성하기
        </Button>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {message}
      </p>
    </div>
  );
}

export { PlaceDetailActions };

import { BellIcon } from "lucide-react";

function DiscoveryAppHeader() {
  return (
    <header
      className="bg-card px-5 pt-[25px] pb-3"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className="type-label text-muted-foreground"
          >
            여행자님, 반가워요
          </p>
          <h1
            className="type-title-lg mt-1 break-keep text-foreground"
          >
            어디로 떠나볼까요?
          </h1>
        </div>
        <button
          type="button"
          aria-label="알림"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary-subtle hover:text-primary"
        >
          <BellIcon className="size-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

export { DiscoveryAppHeader };

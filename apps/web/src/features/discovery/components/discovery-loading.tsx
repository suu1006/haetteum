import { DiscoveryAppHeader } from "./discovery-app-header";

export function DiscoveryLoading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[30rem] bg-background">
      <DiscoveryAppHeader />
      <div role="status" aria-label="여행 정보를 불러오는 중" className="px-4 pb-24">
        <span className="sr-only">여행 정보를 불러오는 중</span>
        <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
          <div className="h-11 rounded-lg bg-muted" />
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="mx-auto h-60 w-48 rounded-xl bg-muted" />
          <div className="h-32 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

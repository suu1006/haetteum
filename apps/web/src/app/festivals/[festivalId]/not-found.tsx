import Link from "next/link";

function FestivalNotFound() {
  return (
    <main className="min-h-screen max-w-[30rem] mx-auto bg-background px-4 py-12">
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
        <h1 className="type-title-lg text-foreground">축제를 찾을 수 없어요</h1>
        <p className="type-body mt-3 text-muted-foreground">
          축제가 종료되었거나 주소가 올바르지 않을 수 있어요.
        </p>
        <Link
          href="/?region=gyeonggi&tab=festivals"
          className="type-label mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-primary-foreground"
        >
          축제 목록으로 돌아가기
        </Link>
      </div>
    </main>
  );
}

export default FestivalNotFound;

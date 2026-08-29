function LoadFailureNotice({ label }: { label: string }) {
  return (
    <section className="px-4 py-16 text-center">
      <h2 className="type-title-md text-foreground">
        {label}를 불러오지 못했어요
      </h2>
      <p className="type-body-md mt-2 text-muted-foreground">
        잠시 후 다시 시도해 주세요.
      </p>
    </section>
  );
}

export { LoadFailureNotice };

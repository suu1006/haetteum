type AuthDividerProps = {
  label?: string;
};

function AuthDivider({ label = "또는" }: AuthDividerProps) {
  return (
    <div className="mt-6 flex items-center gap-3 text-muted-foreground">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="type-caption">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}

export { AuthDivider, type AuthDividerProps };

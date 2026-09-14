import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = { title: "Foundations/DesignTokens" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {
  render: () => (
    <section className="space-y-4" aria-label="해뜸 색상 토큰">
      <h1 className="type-title-lg">색상</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {["primary", "primary-pressed", "primary-subtle", "background", "foreground", "card", "secondary", "muted-foreground", "border", "destructive", "rating", "current-location"].map((token) => (
          <div key={token} className="space-y-2">
            <div className="h-20 rounded-lg border" style={{ backgroundColor: `var(--${token})` }} />
            <p className="type-caption">{token}</p>
          </div>
        ))}
      </div>
    </section>
  ),
};

export const Typography: Story = {
  render: () => (
    <section className="space-y-6" aria-label="해뜸 타이포그래피">
      <h1 className="type-title-lg">Pretendard · 타이포그래피</h1>
      {["type-display", "type-title-lg", "type-title-md", "type-body-lg", "type-body-md", "type-label", "type-caption"].map((className) => (
        <div key={className} className="space-y-2">
          <p className="type-caption text-muted-foreground">{className}</p>
          <p className={className}>새로운 여행이 시작되는 아침 · Haetteum 123</p>
        </div>
      ))}
    </section>
  ),
};

export const Spacing: Story = {
  render: () => (
    <section className="space-y-4" aria-label="해뜸 간격">
      <h1 className="type-title-lg">간격 · Tailwind spacing</h1>
      {[1, 2, 3, 4, 6, 8, 12, 16].map((step) => (
        <div key={step} className="flex items-center gap-4">
          <span className="type-caption w-12">{step}</span>
          <div className="h-5 rounded-sm bg-primary" style={{ width: `calc(var(--spacing) * ${step})` }} />
        </div>
      ))}
    </section>
  ),
};

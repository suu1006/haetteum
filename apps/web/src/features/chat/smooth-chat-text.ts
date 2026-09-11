/** Decouple network bursts from painting, at a steady, readable pace. */
export function createSmoothChatText(onText: (text: string) => void) {
  const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let target: string[] = [];
  let visible = 0;
  let frame: number | null = null;
  let cancelled = false;
  let lastTime = 0;
  let credit = 0;
  let resolveFinished: (() => void) | undefined;

  function tick(time: number) {
    frame = null;
    if (cancelled) return;
    const elapsed = lastTime ? Math.min(time - lastTime, 32) : 16;
    lastTime = time;
    const remaining = target.length - visible;
    // Keep a steady 40 graphemes/second, even when the network delivers a large burst.
    credit += elapsed * 40 / 1000;
    const count = Math.min(remaining, Math.floor(credit));
    if (count > 0) {
      visible += count;
      credit -= count;
      onText(target.slice(0, visible).join(""));
    }
    if (visible < target.length) {
      frame = requestAnimationFrame(tick);
    } else {
      lastTime = 0;
      credit = 0;
      resolveFinished?.();
      resolveFinished = undefined;
    }
  }

  return {
    push(text: string) {
      if (cancelled) return;
      target = Array.from(segmenter.segment(text), part => part.segment);
      if (reducedMotion) {
        visible = target.length;
        onText(text);
      } else if (frame === null && visible < target.length) {
        frame = requestAnimationFrame(tick);
      }
    },
    finish(): Promise<void> {
      if (cancelled || visible === target.length) return Promise.resolve();
      return new Promise(resolve => { resolveFinished = resolve; });
    },
    cancel() {
      cancelled = true;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      resolveFinished?.();
      resolveFinished = undefined;
    },
  };
}

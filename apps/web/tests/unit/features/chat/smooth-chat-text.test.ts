import { afterEach, expect, it, vi } from "vitest";
import { createSmoothChatText } from "@/features/chat/smooth-chat-text";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("reveals a burst over several frames and drains the final text without skipping", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const updates: string[] = [];
  const smooth = createSmoothChatText(text => updates.push(text));
  const text = "서울에서 즐기는 하루 여행을 추천해 드릴게요.";
  smooth.push(text);
  expect(updates).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(48);
  expect(updates[0].length).toBeGreaterThan(0);
  expect(updates[0].length).toBeLessThan(text.length);
  const finished = smooth.finish();
  await vi.runAllTimersAsync();
  await finished;
  expect(updates.at(-1)).toBe(text);
  expect(updates.length).toBeGreaterThan(2);
});

it("cancels queued text without later updates", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const updates: string[] = [];
  const smooth = createSmoothChatText(text => updates.push(text));
  smooth.push("취소된 답변");
  smooth.cancel();
  await vi.runAllTimersAsync();
  expect(updates).toEqual([]);
  await smooth.finish();
});


it("keeps a large burst at a relaxed pace instead of accelerating", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  let output = "";
  const smooth = createSmoothChatText(text => { output = text; });
  smooth.push("가".repeat(300));
  await vi.advanceTimersByTimeAsync(1000);
  expect(output.length).toBeGreaterThanOrEqual(38);
  expect(output.length).toBeLessThanOrEqual(41);
  smooth.cancel();
});

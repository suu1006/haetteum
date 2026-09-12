import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ChatLayout from "@/app/chat/layout";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
  vi.mocked(headers).mockResolvedValue(new Headers() as never);
  vi.mocked(redirect).mockImplementation((url) => { throw new Error(`redirect:${url}`); });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("redirects anonymous visitors to login with a return path to chat", async () => {
  vi.stubGlobal("fetch", async () => new Response(null, { status: 401 }));
  await expect(ChatLayout({ children: "chat" })).rejects.toThrow("redirect:/login?returnTo=%2Fchat");
});
it("renders chat for a server-verified session", async () => {
  vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1", displayName: "여행자", profileImageUrl: null, provider: "KAKAO" })));
  await expect(ChatLayout({ children: "chat" })).resolves.toBe("chat");
});
it("does not render chat when session verification is unavailable", async () => {
  vi.stubGlobal("fetch", async () => new Response(null, { status: 503 }));
  await expect(ChatLayout({ children: "chat" })).rejects.toThrow("Unable to load current user");
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChatHistoryPanel } from "./chat-history-panel";
import * as api from "./chat-history-api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChatHistoryPanel", () => {
  it("loads conversations when opened and reports a selection", async () => {
    vi.spyOn(api, "listChatConversations").mockResolvedValue({
      items: [
        {
          id: "conv-1",
          title: "서울 여행",
          updatedAt: "2026-09-14T00:00:00.000Z",
          preview: "안녕하세요",
        },
      ],
      nextCursor: null,
    });
    const onSelect = vi.fn();

    render(<ChatHistoryPanel open onOpenChange={vi.fn()} onSelectConversation={onSelect} />);

    await waitFor(() => screen.getByText("서울 여행"));
    await userEvent.click(screen.getByText("서울 여행"));

    expect(onSelect).toHaveBeenCalledWith("conv-1");
  });

  it("shows an error state when the list fails to load", async () => {
    vi.spyOn(api, "listChatConversations").mockRejectedValue(new Error("network"));

    render(<ChatHistoryPanel open onOpenChange={vi.fn()} onSelectConversation={vi.fn()} />);

    await waitFor(() => screen.getByRole("alert"));
  });

  it("does not fetch while closed", () => {
    const spy = vi.spyOn(api, "listChatConversations");

    render(<ChatHistoryPanel open={false} onOpenChange={vi.fn()} onSelectConversation={vi.fn()} />);

    expect(spy).not.toHaveBeenCalled();
  });
});

"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

import {
  ChatResponseSchema,
  type ChatMessage,
  type ChatResponse,
} from "@haetteum/contracts";

/// 설계 확정 전 최소 수직 슬라이스 — 입력 → API → Bedrock → 화면 표시만 검증한다.
/// 대화 저장, 로그인 유도, 코스 생성은 아직 없다.

/// react-markdown이 넘기는 node prop은 DOM에 그대로 붙이면 경고가 나서 걷어낸다.
const markdownComponents: Components = {
  h1: ({ node, ...props }) => (
    <h2 style={{ fontSize: 17, fontWeight: 700, margin: "14px 0 6px" }} {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h3 style={{ fontSize: 15, fontWeight: 700, margin: "12px 0 4px" }} {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h4 style={{ fontSize: 14, fontWeight: 700, margin: "10px 0 4px" }} {...props} />
  ),
  p: ({ node, ...props }) => <p style={{ margin: "6px 0" }} {...props} />,
  strong: ({ node, ...props }) => (
    <strong style={{ fontWeight: 700 }} {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul style={{ margin: "6px 0", paddingLeft: 20 }} {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol style={{ margin: "6px 0", paddingLeft: 20 }} {...props} />
  ),
  li: ({ node, ...props }) => <li style={{ margin: "3px 0" }} {...props} />,
  hr: () => (
    <hr style={{ margin: "14px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />
  ),
  a: ({ node, ...props }) => (
    <a style={{ color: "#2563eb" }} target="_blank" rel="noreferrer" {...props} />
  ),
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setSending(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(
        /\/+$/,
        "",
      );
      if (!baseUrl) {
        setError("API 주소가 설정되어 있지 않습니다.");
        return;
      }

      const response = await fetch(`${baseUrl}/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        setError("응답을 받지 못했습니다.");
        return;
      }

      const parsed: ChatResponse = ChatResponseSchema.parse(
        await response.json(),
      );

      if (parsed.status === "unavailable") {
        setError("지금은 챗봇을 사용할 수 없습니다.");
        return;
      }

      setMessages([
        ...nextMessages,
        { role: "assistant", content: parsed.reply },
      ]);
    } catch {
      setError("응답을 받지 못했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        여행 챗봇 (임시 확인용)
      </h1>

      <ul style={{ listStyle: "none", padding: 0, marginBottom: 16 }}>
        {messages.map((message, index) => (
          <li
            key={index}
            style={{
              margin: "12px 0",
              textAlign: message.role === "user" ? "right" : "left",
            }}
          >
            {message.role === "user" ? (
              <span
                style={{
                  display: "inline-block",
                  maxWidth: "85%",
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "#dbeafe",
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "keep-all",
                  overflowWrap: "break-word",
                }}
              >
                {message.content}
              </span>
            ) : (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "12px 16px",
                  lineHeight: 1.6,
                  fontSize: 14,
                  wordBreak: "keep-all",
                  overflowWrap: "break-word",
                }}
              >
                <ReactMarkdown components={markdownComponents}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" style={{ color: "#dc2626", marginBottom: 8 }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="메시지를 입력하세요"
          disabled={sending}
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        />
        <button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: "#2563eb",
            color: "#fff",
          }}
        >
          {sending ? "전송 중..." : "전송"}
        </button>
      </form>
    </main>
  );
}

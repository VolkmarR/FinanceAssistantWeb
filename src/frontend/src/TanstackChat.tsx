import { useState } from "react";
import { useChat, fetchServerSentEvents, type UIMessage } from "@tanstack/ai-react";

// The AG-UI version of the chat. Instead of hand-parsing a text stream, it lets
// TanStack AI's useChat drive the conversation. The fetchServerSentEvents adapter
// POSTs an AG-UI RunAgentInput to /api/agui and parses the typed AG-UI SSE events
// the .NET backend emits (MapAGUI in Program.cs) — so streaming text, tool calls,
// and human-in-the-loop approvals all arrive as structured message parts.
//
// Unlike the classic chat, there is no server-side session id: AG-UI is stateless
// per request and useChat replays the full message history plus a stable threadId
// on every turn, which is what gives the conversation continuity.
export default function TanstackChat() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, isLoading, error, addToolApprovalResponse } = useChat({
    connection: fetchServerSentEvents("/api/agui"),
  });

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    void sendMessage(text);
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} onApprove={addToolApprovalResponse} />
        ))}
        {isLoading && <div style={{ color: "#64748b" }}>…</div>}
      </div>

      {error && (
        <p role="alert" style={{ color: "#b91c1c", marginBottom: 12 }}>
          ⚠️ {error.message}
        </p>
      )}

      <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spending…"
          style={{ flex: 1, padding: 8 }}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </>
  );
}

type ApprovalResponder = (response: { id: string; approved: boolean }) => Promise<void>;

// Renders one UIMessage by walking its parts. A single assistant turn can mix
// text, reasoning ("thinking"), and tool-call parts, so each part is rendered
// on its own.
function MessageRow({
  message,
  onApprove,
}: {
  message: UIMessage;
  onApprove: ApprovalResponder;
}) {
  const isUser = message.role === "user";

  return (
    <div style={{ textAlign: isUser ? "right" : "left" }}>
      {message.parts.map((part, idx) => {
        switch (part.type) {
          case "text":
            return (
              <span
                key={idx}
                style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: 8,
                  whiteSpace: "pre-wrap",
                  background: isUser ? "#2563eb" : "#f1f5f9",
                  color: isUser ? "#fff" : "#0f172a",
                }}
              >
                {part.content}
              </span>
            );

          case "thinking":
            return (
              <div key={idx} style={{ fontSize: 13, fontStyle: "italic", color: "#64748b" }}>
                💭 {part.content}
              </div>
            );

          case "tool-call":
            return (
              <div
                key={idx}
                style={{
                  display: "inline-block",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#fffbeb",
                  color: "#0f172a",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600 }}>🛠️ {part.name}</div>
                {part.arguments && (
                  <pre style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", fontSize: 12 }}>
                    {part.arguments}
                  </pre>
                )}

                {part.state === "approval-requested" && part.approval && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => void onApprove({ id: part.approval!.id, approved: true })}>
                      Approve
                    </button>
                    <button onClick={() => void onApprove({ id: part.approval!.id, approved: false })}>
                      Deny
                    </button>
                  </div>
                )}

                {part.state === "approval-responded" && (
                  <div style={{ marginTop: 6, color: "#64748b" }}>
                    {part.approval?.approved ? "✅ Approved" : "🚫 Denied"}
                  </div>
                )}
              </div>
            );

          default:
            // tool-result / structured-output / media parts aren't surfaced in
            // this UI — the assistant's text part already narrates the outcome.
            return null;
        }
      })}
    </div>
  );
}

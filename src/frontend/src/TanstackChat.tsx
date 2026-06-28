import { useState } from "react";
import { useChat, fetchServerSentEvents, type UIMessage } from "@tanstack/ai-react";
import { bubbleClasses, buttonClasses, rowClasses } from "./ui";

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
      <div className="mb-4 flex flex-col gap-3">
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} onApprove={addToolApprovalResponse} />
        ))}
        {isLoading && <div className="text-slate-500">…</div>}
      </div>

      {error && (
        <p role="alert" className="mb-3 text-red-700">
          ⚠️ {error.message}
        </p>
      )}

      <form onSubmit={send} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spending…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 disabled:opacity-50"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className={buttonClasses("primary")}
        >
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
    <div className={rowClasses(isUser)}>
      {message.parts.map((part, idx) => {
        switch (part.type) {
          case "text":
            return (
              <span key={idx} className={bubbleClasses(isUser)}>
                {part.content}
              </span>
            );

          case "thinking":
            return (
              <div key={idx} className="text-[13px] italic text-slate-500">
                💭 {part.content}
              </div>
            );

          case "tool-call":
            return (
              <div
                key={idx}
                className="inline-block rounded-lg border border-slate-200 bg-amber-50 px-3 py-2 text-left text-[13px] text-slate-900 shadow-sm"
              >
                <div className="font-semibold">🛠️ {part.name}</div>
                {part.arguments && (
                  <pre className="mt-1 whitespace-pre-wrap text-xs">{part.arguments}</pre>
                )}

                {part.state === "approval-requested" && part.approval && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => void onApprove({ id: part.approval!.id, approved: true })}
                      className={buttonClasses("primary", "sm")}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => void onApprove({ id: part.approval!.id, approved: false })}
                      className={buttonClasses("secondary", "sm")}
                    >
                      Deny
                    </button>
                  </div>
                )}

                {part.state === "approval-responded" && (
                  <div className="mt-1.5 text-slate-500">
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

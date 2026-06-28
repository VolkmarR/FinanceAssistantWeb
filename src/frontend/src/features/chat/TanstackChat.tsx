import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";
import { ChatComposer } from "../../components/ChatComposer";
import { AgentMessage } from "./AgentMessage";

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
  const { messages, sendMessage, isLoading, error, addToolApprovalResponse } = useChat({
    connection: fetchServerSentEvents("/api/agui"),
  });

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        {messages.map((m) => (
          <AgentMessage key={m.id} message={m} onApprove={addToolApprovalResponse} />
        ))}
        {isLoading && <div className="text-slate-500">…</div>}
      </div>

      {error && (
        <p role="alert" className="mb-3 text-red-700">
          ⚠️ {error.message}
        </p>
      )}

      <ChatComposer onSend={(text) => void sendMessage(text)} disabled={isLoading} />
    </>
  );
}

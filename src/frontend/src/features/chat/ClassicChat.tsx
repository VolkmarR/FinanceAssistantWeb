import { ChatComposer } from "../../components/ChatComposer";
import { MessageBubble, MessageRow } from "../../components/MessageBubble";
import { useClassicChat } from "./useClassicChat";

// The original hand-rolled chat: talks to POST /api/chat (plain-text SSE). The
// streaming logic lives in useClassicChat; this component just renders the
// conversation and a composer. Kept as the "Classic" route next to the TanStack
// AI / AG-UI version.
export default function ClassicChat() {
  const { messages, busy, send } = useClassicChat();

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <MessageRow key={i} isUser={isUser}>
              <MessageBubble isUser={isUser}>{m.content || (busy ? "…" : "")}</MessageBubble>
            </MessageRow>
          );
        })}
      </div>

      <ChatComposer onSend={send} disabled={busy} />
    </>
  );
}

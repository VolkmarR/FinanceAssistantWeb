import { useRef, useState } from "react";
import { readSseStream } from "../../lib/sse";
import type { Message } from "../../types";

// Owns the Classic chat's conversation state and the hand-rolled streaming call to
// POST /api/chat (plain-text SSE), so the ClassicChat component stays purely
// presentational. The component passes already-trimmed text to `send`.
export function useClassicChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);

  // One conversation id for the lifetime of this tab → the server keeps our session.
  const sessionId = useRef(crypto.randomUUID());

  async function send(text: string) {
    if (!text || busy) return;

    setBusy(true);

    // Show the user's message, then an empty assistant message we stream into.
    const assistantIndex = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    // Rewrite the assistant message in place; `update` receives its current text
    // so the streaming path can append and the error path can replace.
    const writeAssistant = (update: (current: string) => string) =>
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIndex] = { role: "assistant", content: update(next[assistantIndex].content) };
        return next;
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.current, message: text }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`);
      }

      await readSseStream(res.body, (chunk) => writeAssistant((current) => current + chunk));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      writeAssistant(() => `⚠️ ${message}`);
    } finally {
      setBusy(false);
    }
  }

  return { messages, busy, send };
}

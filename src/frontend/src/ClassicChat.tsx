import { useRef, useState } from "react";
import { bubbleClasses, buttonClasses, rowClasses } from "./ui";

type Role = "user" | "assistant";
interface Message {
  role: Role;
  content: string;
}

// The original hand-rolled chat: talks to POST /api/chat (plain-text SSE) and
// parses the stream by hand. Kept verbatim so the "Classic" route is an exact
// before-picture next to the TanStack AI / AG-UI version.
export default function ClassicChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  // One conversation id for the lifetime of this tab → the server keeps our session.
  const sessionId = useRef(crypto.randomUUID());

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    setInput("");
    setBusy(true);

    // Show the user's message, then an empty assistant message we stream into.
    const assistantIndex = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.current, message: text }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`);
      }

      await readSseStream(res.body, (chunk) => {
        setMessages((prev) => {
          const next = [...prev];
          next[assistantIndex] = {
            role: "assistant",
            content: next[assistantIndex].content + chunk,
          };
          return next;
        });
      });
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIndex] = {
          role: "assistant",
          content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong."}`,
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={i} className={rowClasses(isUser)}>
              <span className={bubbleClasses(isUser)}>{m.content || (busy ? "…" : "")}</span>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spending…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30"
        />
        <button
          type="submit"
          disabled={busy}
          className={buttonClasses("primary")}
        >
          Send
        </button>
      </form>
    </>
  );
}

// Reads a text/event-stream body, invoking onChunk for each decoded "data:" payload.
// Frames are separated by a blank line; payloads are JSON-encoded text chunks, except
// the terminal "[DONE]" sentinel which ends the stream.
async function readSseStream(body: ReadableStream<Uint8Array>, onChunk: (text: string) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;

      const payload = dataLine.slice("data:".length).trim();
      if (payload === "[DONE]") return;

      try {
        onChunk(JSON.parse(payload) as string);
      } catch {
        // Ignore frames that aren't JSON payloads (e.g. stray keep-alives).
      }
    }
  }
}

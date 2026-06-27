import { useRef, useState } from "react";

type Role = "user" | "assistant";
interface Message {
  role: Role;
  content: string;
}

export default function App() {
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
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1>Finance Assistant</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.role === "user" ? "right" : "left" }}>
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 8,
                whiteSpace: "pre-wrap",
                background: m.role === "user" ? "#2563eb" : "#f1f5f9",
                color: m.role === "user" ? "#fff" : "#0f172a",
              }}
            >
              {m.content || (busy ? "…" : "")}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spending…"
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" disabled={busy}>
          Send
        </button>
      </form>
    </main>
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

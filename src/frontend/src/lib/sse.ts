// Reads a text/event-stream body, invoking onChunk for each decoded "data:" payload.
// Frames are separated by a blank line; payloads are JSON-encoded text chunks, except
// the terminal "[DONE]" sentinel which ends the stream.
//
// This is the hand-rolled SSE reader the Classic chat uses. It lives in lib/ (not in
// the component) so the component stays presentational and the parser is unit-testable
// in isolation.
export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void,
) {
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

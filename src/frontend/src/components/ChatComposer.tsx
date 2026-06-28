import { useState, type FormEvent } from "react";
import { Button } from "./Button";
import { TextInput } from "./TextInput";

interface ChatComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// The message-entry form shared by both chat screens. It owns its own input state
// and the trim/clear-on-submit behaviour, so each chat only has to supply an
// onSend callback and a disabled flag — no duplicated <form> + useState per screen.
export function ChatComposer({
  onSend,
  disabled = false,
  placeholder = "Ask about your spending…",
}: ChatComposerProps) {
  const [input, setInput] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || disabled) return;
    setInput("");
    onSend(text);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <TextInput
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      <Button type="submit" disabled={disabled}>
        Send
      </Button>
    </form>
  );
}

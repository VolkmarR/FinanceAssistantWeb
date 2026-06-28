import type { UIMessage } from "@tanstack/ai-react";
import { MessageBubble, MessageRow } from "../../components/MessageBubble";
import { ToolCallCard } from "./ToolCallCard";
import type { ApprovalResponder } from "../../types";

// Renders one UIMessage by walking its parts. A single assistant turn can mix
// text, reasoning ("thinking"), and tool-call parts, so each part is rendered
// on its own.
export function AgentMessage({
  message,
  onApprove,
}: {
  message: UIMessage;
  onApprove: ApprovalResponder;
}) {
  const isUser = message.role === "user";

  return (
    <MessageRow isUser={isUser}>
      {message.parts.map((part, idx) => {
        switch (part.type) {
          case "text":
            return (
              <MessageBubble key={idx} isUser={isUser}>
                {part.content}
              </MessageBubble>
            );

          case "thinking":
            return (
              <div key={idx} className="text-[13px] italic text-slate-500">
                💭 {part.content}
              </div>
            );

          case "tool-call":
            return (
              <ToolCallCard
                key={idx}
                name={part.name}
                arguments={part.arguments}
                state={part.state}
                approval={part.approval}
                onApprove={onApprove}
              />
            );

          default:
            // tool-result / structured-output / media parts aren't surfaced in
            // this UI — the assistant's text part already narrates the outcome.
            return null;
        }
      })}
    </MessageRow>
  );
}

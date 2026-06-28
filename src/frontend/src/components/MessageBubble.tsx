import type { ReactNode } from "react";
import { cn } from "../lib/cn";

// The row that wraps message content, aligning user turns to the right.
export function MessageRow({ isUser, children }: { isUser: boolean; children: ReactNode }) {
  return <div className={isUser ? "text-right" : "text-left"}>{children}</div>;
}

// A single chat text bubble. `isUser` flips it to the blue right-aligned treatment;
// the assistant variant is the light slate bubble. Rendered identically by both the
// Classic and TanStack AI chats, which is why it lives here once.
export function MessageBubble({ isUser, children }: { isUser: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-block max-w-[85%] rounded-lg px-3 py-2 shadow-sm whitespace-pre-wrap",
        isUser ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900",
      )}
    >
      {children}
    </span>
  );
}

// Shared domain types used across the chat feature and components.

// A turn in the Classic chat, whose messages are plain role + text (the AG-UI
// chat instead uses the richer UIMessage/parts model from @tanstack/ai-react).
export type Role = "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

// Signature of the callback that answers a human-in-the-loop tool approval.
// Matches @tanstack/ai-react's addToolApprovalResponse.
export type ApprovalResponder = (response: { id: string; approved: boolean }) => Promise<void>;

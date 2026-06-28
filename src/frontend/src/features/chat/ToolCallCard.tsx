import { Button } from "../../components/Button";
import type { ApprovalResponder } from "../../types";

interface ToolCallCardProps {
  name: string;
  arguments?: string;
  state?: string;
  approval?: { id: string; approved?: boolean };
  onApprove: ApprovalResponder;
}

// Renders one assistant tool-call as an amber card: the tool name, its arguments,
// and — when the backend is waiting on a human-in-the-loop gate — Approve/Deny
// buttons, which flip to a ✅/🚫 result line once answered. This lives in the chat
// feature (not components/) because it encodes AG-UI's approval state machine,
// which only this chat variant has — it isn't a generic UI primitive.
export function ToolCallCard({ name, arguments: args, state, approval, onApprove }: ToolCallCardProps) {
  return (
    <div className="inline-block rounded-lg border border-slate-200 bg-amber-50 px-3 py-2 text-left text-[13px] text-slate-900 shadow-sm">
      <div className="font-semibold">🛠️ {name}</div>
      {args && <pre className="mt-1 whitespace-pre-wrap text-xs">{args}</pre>}

      {state === "approval-requested" && approval && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => void onApprove({ id: approval.id, approved: true })}>
            Approve
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void onApprove({ id: approval.id, approved: false })}
          >
            Deny
          </Button>
        </div>
      )}

      {state === "approval-responded" && (
        <div className="mt-1.5 text-slate-500">
          {approval?.approved ? "✅ Approved" : "🚫 Denied"}
        </div>
      )}
    </div>
  );
}

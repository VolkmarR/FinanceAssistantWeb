import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

// Single-line text input used by the chat composer. Spreads native input props
// so callers control value/onChange/placeholder/disabled; the shared look lives
// here once instead of being copy-pasted into each chat screen.
export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 " +
          "outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

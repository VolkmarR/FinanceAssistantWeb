// Shared UI class helpers. The user/assistant text bubble is rendered identically
// by both ClassicChat and TanstackChat, so its styling lives here once instead of
// being copy-pasted (which is what the old inline-style version did).

// Classes for a single chat text bubble. `isUser` flips it to the blue right-aligned
// treatment; the assistant variant is the light slate bubble.
export function bubbleClasses(isUser: boolean): string {
  return [
    "inline-block max-w-[85%] rounded-lg px-3 py-2 shadow-sm whitespace-pre-wrap",
    isUser ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900",
  ].join(" ");
}

// Classes for the row that wraps a bubble, aligning user messages right.
export function rowClasses(isUser: boolean): string {
  return isUser ? "text-right" : "text-left";
}

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "md" | "sm";

// Shared button styling. The hover states are intentionally a *two-step* colour
// shift (blue-600 -> blue-800, white -> slate-200) rather than the one-step
// blue-600 -> blue-700 they used to be: a single step is too subtle to read,
// which made the buttons look unresponsive ("invisible") on hover. We also set
// cursor-pointer explicitly because Tailwind v4's preflight no longer applies it
// to <button>, and a focus-visible ring so keyboard users get the same affordance.
export function buttonClasses(variant: ButtonVariant, size: ButtonSize = "md"): string {
  const base =
    "cursor-pointer font-medium transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 " +
    "disabled:cursor-not-allowed disabled:opacity-50";

  // Rounding lives with the size (not in `base`) so the two rounded-* utilities
  // never collide — equal-specificity Tailwind classes resolve by source order,
  // not className order, so listing both would be a coin toss.
  const sizing = size === "sm" ? "rounded-md px-3 py-1 text-xs" : "rounded-lg px-4 py-2";

  const look =
    variant === "primary"
      ? "bg-blue-600 text-white shadow-sm hover:bg-blue-800 focus-visible:ring-blue-600/40"
      : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-200 focus-visible:ring-slate-400/40";

  return [base, sizing, look].join(" ");
}

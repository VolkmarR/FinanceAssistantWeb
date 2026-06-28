import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "md" | "sm";

// These class strings depend only on the variant/size props, so they live at
// module scope and are computed once — not rebuilt on every render.

// We set cursor-pointer explicitly because Tailwind v4's preflight no longer
// applies it to <button>, and a focus-visible ring so keyboard users get the
// same affordance as the hover state.
const BASE =
  "cursor-pointer font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

// Rounding lives with the size (not in BASE) so the two rounded-* utilities
// never collide — equal-specificity Tailwind classes resolve by source order,
// not className order, so listing both would be a coin toss.
const SIZING: Record<ButtonSize, string> = {
  md: "rounded-lg px-4 py-2",
  sm: "rounded-md px-3 py-1 text-xs",
};

// The hover states are intentionally a *two-step* colour shift (blue-600 ->
// blue-800, white -> slate-200) rather than the one-step blue-600 -> blue-700
// they used to be: a single step is too subtle to read, which made the buttons
// look unresponsive ("invisible") on hover.
const LOOK: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white shadow-sm hover:bg-blue-800 focus-visible:ring-blue-600/40",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-200 focus-visible:ring-slate-400/40",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={cn(BASE, SIZING[size], LOOK[variant], className)} {...props} />;
}

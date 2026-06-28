import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

// Base + active nav link styling. activeProps merges the active classes onto the
// active link, so the active treatment overrides the base background/border/text.
const navLinkClasses =
  "rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 no-underline transition-colors hover:bg-slate-100";

const activeNavLinkClasses = "border-blue-600 bg-blue-600 text-white hover:bg-blue-600";

// A tab in the version switcher. Wraps TanStack Router's <Link> with the shared
// styling so the nav doesn't repeat the class strings per tab. `to` and other
// Link props pass straight through.
export function NavLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={navLinkClasses}
      activeProps={{ className: activeNavLinkClasses }}
    />
  );
}

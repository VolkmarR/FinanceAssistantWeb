import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Link,
  Outlet,
} from "@tanstack/react-router";
import ClassicChat from "./ClassicChat";
import TanstackChat from "./TanstackChat";

// Shared page chrome: title + the version switcher, then the active chat below.
function RootLayout() {
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">Finance Assistant</h1>

      <nav className="mb-4 flex gap-2">
        <Link to="/chat" className={navLinkClasses} activeProps={{ className: activeNavLinkClasses }}>
          Classic
        </Link>
        <Link
          to="/chat-agui"
          className={navLinkClasses}
          activeProps={{ className: activeNavLinkClasses }}
        >
          TanStack AI
        </Link>
      </nav>

      <Outlet />
    </main>
  );
}

// Base + active nav link styling. activeProps merges these classes onto the active
// link, so the active treatment overrides the base background/border/text colors.
const navLinkClasses =
  "rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 no-underline transition-colors hover:bg-slate-100";

const activeNavLinkClasses = "border-blue-600 bg-blue-600 text-white hover:bg-blue-600";

const rootRoute = createRootRoute({ component: RootLayout });

// "/" has no UI of its own — send people to the classic chat by default.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/chat" });
  },
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: ClassicChat,
});

const aguiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat-agui",
  component: TanstackChat,
});

const routeTree = rootRoute.addChildren([indexRoute, chatRoute, aguiRoute]);

export const router = createRouter({ routeTree });

// Register the router instance for full type inference on Link/useNavigate/etc.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

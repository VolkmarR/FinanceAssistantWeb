import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { aiDevtoolsPlugin } from "@tanstack/react-ai-devtools";
import { NavLink } from "../components/NavLink";
import ClassicChat from "../features/chat/ClassicChat";
import TanstackChat from "../features/chat/TanstackChat";

// Shared page chrome: title + the version switcher, then the active chat below.
function RootLayout() {
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">Finance Assistant</h1>

      <nav className="mb-4 flex gap-2">
        <NavLink to="/chat">Classic</NavLink>
        <NavLink to="/chat-agui">TanStack AI</NavLink>
      </nav>

      <Outlet />

      {/* Dev-only inspector for the TanStack AI chat (runs, stream events, tool calls).
          Gated on import.meta.env.DEV so Vite tree-shakes it out of the production build
          that ships to the backend's wwwroot. */}
      {import.meta.env.DEV && (
        <TanStackDevtools plugins={[aiDevtoolsPlugin()]} />
      )}
    </main>
  );
}

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

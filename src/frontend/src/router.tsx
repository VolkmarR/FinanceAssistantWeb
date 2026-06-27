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
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1>Finance Assistant</h1>

      <nav style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Link to="/chat" style={navLinkStyle} activeProps={{ style: activeNavLinkStyle }}>
          Classic
        </Link>
        <Link to="/chat-agui" style={navLinkStyle} activeProps={{ style: activeNavLinkStyle }}>
          TanStack AI
        </Link>
      </nav>

      <Outlet />
    </main>
  );
}

const navLinkStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  textDecoration: "none",
  color: "#0f172a",
};

const activeNavLinkStyle: React.CSSProperties = {
  background: "#2563eb",
  borderColor: "#2563eb",
  color: "#fff",
};

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

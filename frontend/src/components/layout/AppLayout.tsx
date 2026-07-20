import {
  Briefcase,
  ClipboardList,
  Home,
  Lightbulb,
  LogOut,
  Settings2,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const workspaceNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/tracker", label: "Tracker", icon: ClipboardList },
  { to: "/insights", label: "Insights", icon: TrendingUp },
  { to: "/strategy", label: "Strategy", icon: Lightbulb },
];

const accountNav = [
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/preferences", label: "Preferences", icon: Settings2 },
];

function userInitials(email: string) {
  const name = email.split("@")[0] ?? "U";
  return name.slice(0, 2).toUpperCase();
}

function NavSection({
  title,
  items,
}: {
  title: string;
  items: { to: string; label: string; icon: typeof Home }[];
}) {
  return (
    <div className="space-y-1.5">
      <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">{title}</p>
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-gradient-to-r from-primary/15 via-cyan-500/10 to-transparent text-primary shadow-[inset_0_0_0_1px_oklch(0.74_0.14_192/0.2)]"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-colors",
                  isActive ? "gradient-primary text-white shadow-sm" : "bg-muted/60 text-muted-foreground group-hover:text-primary",
                )}
              >
                <Icon className="size-4" />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export function AppLayout({
  email,
  children,
  onLogout,
}: {
  email: string;
  children: React.ReactNode;
  onLogout: () => void;
}) {
  const location = useLocation();
  const { isDemo } = useAuth();
  const mobileNav = workspaceNav;

  return (
    <div className="min-h-dvh md:p-3 lg:p-4">
      <aside className="glass-panel fixed inset-y-0 left-0 z-40 hidden h-dvh w-[272px] flex-col overflow-hidden p-4 md:flex md:inset-y-3 md:left-3 md:h-[calc(100dvh-1.5rem)] md:rounded-3xl lg:inset-y-4 lg:left-4 lg:h-[calc(100dvh-2rem)]">
          <div className="mb-8 flex items-center gap-3 px-1">
            <div className="gradient-primary flex size-10 items-center justify-center rounded-2xl shadow-lg shadow-primary/25">
              <Sparkles className="size-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold tracking-tight">AI Job Agent</p>
                {isDemo ? <Badge variant="secondary">Demo</Badge> : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">Career workspace</p>
            </div>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto">
            <NavSection title="Workspace" items={workspaceNav} />
            <NavSection title="Account" items={accountNav} />
          </nav>

          <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
            <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3 ring-1 ring-border/80">
              <div className="gradient-primary flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white">
                {userInitials(email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{email.split("@")[0]}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={onLogout}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </aside>

      <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col md:pl-[296px] lg:pl-[304px]">
          <header className="safe-top glass-panel sticky top-0 z-30 flex items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-4 py-3 md:hidden">
            <div className="flex items-center gap-2.5">
              <div className="gradient-primary flex size-9 items-center justify-center rounded-xl">
                <Sparkles className="size-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">AI Job Agent</p>
                  {isDemo ? <Badge variant="secondary">Demo</Badge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </header>

          <main className="flex-1 px-4 py-5 pb-28 md:px-6 md:py-6 md:pb-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
      </div>

      <nav className="safe-bottom glass-panel fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 px-3 py-2 md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {mobileNav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition-all",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "rounded-xl p-2 transition-all",
                    active ? "gradient-primary text-white shadow-md shadow-primary/30" : "bg-muted/60",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="truncate">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

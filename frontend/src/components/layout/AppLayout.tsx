import { Briefcase, Home, LogOut, Settings2, UserRound } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/preferences", label: "Preferences", icon: Settings2 },
];

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
  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-dvh w-64 flex-col justify-between overflow-y-auto border-r border-border bg-card/95 p-4 backdrop-blur md:flex">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">AI-Job-Agent</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{email}</p>
          </div>
          <nav className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <Button variant="outline" className="mt-4 w-full shrink-0" onClick={onLogout}>
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </aside>
      <div className="flex min-h-dvh flex-col md:pl-64">
        <header className="safe-top sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">AI-Job-Agent</p>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 pb-24 md:pb-6">{children}</main>
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span className={cn("rounded-xl p-1.5", active && "bg-primary/10")}>
                    <Icon className="size-5" />
                  </span>
                  {label}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

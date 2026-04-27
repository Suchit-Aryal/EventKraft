import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Sparkles, LayoutDashboard, Briefcase, MessageSquare, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const location = useLocation();
  const isWorker = location.pathname.includes("/worker");

  const navItems = isWorker
    ? [
        { to: "/dashboard/worker" as const, label: "Overview", icon: LayoutDashboard },
        { to: "/jobs" as const, label: "Find jobs", icon: Briefcase },
      ]
    : [
        { to: "/dashboard/customer" as const, label: "Overview", icon: LayoutDashboard },
        { to: "/post-job" as const, label: "Post a job", icon: Briefcase },
      ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex md:w-64 flex-col border-r border-border bg-card">
        <div className="p-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold">EventKraft</span>
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">
            {isWorker ? "Worker dashboard" : "Customer dashboard"}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              activeProps={{ className: "bg-primary/10 text-primary" }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full">
            <MessageSquare className="h-4 w-4" /> Messages
          </button>
          <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full">
            <Settings className="h-4 w-4" /> Settings
          </button>
        </nav>

        <div className="p-3 border-t border-border">
          <Button variant="ghost" asChild className="w-full justify-start">
            <Link to="/">
              <LogOut className="h-4 w-4 mr-2" /> Log out
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="md:hidden border-b border-border bg-card px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold">EventKraft</span>
          </Link>
          <div className="flex gap-2">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} className="text-xs px-2 py-1 rounded-md hover:bg-muted">
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

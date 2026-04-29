import { Link } from "@tanstack/react-router";
import { Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { to: "/app/providers" as const, label: "Browse Providers" },
  { to: "/app/jobs" as const, label: "Browse Jobs" },
  { to: "/app/post-job" as const, label: "Post a Job" },
  { to: "/app/how-it-works" as const, label: "How it Works" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-soft">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">
            EventKraft
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" asChild>
            <Link to="/app/login">Log in</Link>
          </Button>
          <Button asChild className="bg-gradient-hero text-primary-foreground hover:opacity-95">
            <Link to="/app/signup">Get started</Link>
          </Button>
        </div>

        <button
          className="lg:hidden p-2 rounded-md hover:bg-muted"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" asChild className="flex-1">
                <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
              </Button>
              <Button asChild className="flex-1 bg-gradient-hero text-primary-foreground">
                <Link to="/signup" onClick={() => setOpen(false)}>Sign up</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

import { Link } from "@tanstack/react-router";
import { Sparkles, Instagram, Facebook, Mail } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40 mt-20">
      <div className="container mx-auto px-4 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-semibold">EventKraft</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-sm">
              Nepal's premium marketplace for wedding & event professionals.
              Where premium talent meets grand events.
            </p>
            <div className="flex gap-3 mt-5">
              <a href="#" aria-label="Instagram" className="p-2 rounded-md bg-background hover:bg-muted transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Facebook" className="p-2 rounded-md bg-background hover:bg-muted transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Email" className="p-2 rounded-md bg-background hover:bg-muted transition-colors">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">For Customers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/providers" className="hover:text-foreground">Browse providers</Link></li>
              <li><Link to="/post-job" className="hover:text-foreground">Post a job</Link></li>
              <li><Link to="/how-it-works" className="hover:text-foreground">How it works</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">For Workers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/jobs" className="hover:text-foreground">Browse jobs</Link></li>
              <li><Link to="/signup" className="hover:text-foreground">Become a provider</Link></li>
              <li><Link to="/dashboard/worker" className="hover:text-foreground">Worker dashboard</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} EventKraft. Made with ❤ in Nepal.</p>
          <p>All prices in NPR. Platform commission applies.</p>
        </div>
      </div>
    </footer>
  );
}

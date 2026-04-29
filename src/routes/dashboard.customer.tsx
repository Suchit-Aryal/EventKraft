import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, MessageSquare, Heart, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { jobs, providers, formatNpr } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/customer")({
  head: () => ({ meta: [{ title: "Customer Dashboard — EventKraft" }] }),
  component: CustomerDashboard,
});

function CustomerDashboard() {
  const myJobs = jobs.slice(0, 2);
  const saved = providers.slice(0, 3);

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Welcome back, Anita 👋</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your events.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Briefcase} label="Active jobs" value="2" tint="primary" />
        <Stat icon={MessageSquare} label="New proposals" value="14" tint="gold" />
        <Stat icon={Heart} label="Saved providers" value="8" tint="primary" />
        <Stat icon={TrendingUp} label="Avg. response" value="2h" tint="gold" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Your active jobs</h2>
          <Button asChild size="sm" className="bg-gradient-hero text-primary-foreground">
            <Link to="/post-job">Post new job</Link>
          </Button>
        </div>
        <div className="space-y-3">
          {myJobs.map((j) => (
            <Card key={j.id} className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="min-w-0 flex-1">
                  <Link to="/jobs/$slug" params={{ slug: j.slug }} className="font-semibold hover:text-primary">
                    {j.title}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">
                    Budget: {formatNpr(j.budgetMin)} – {formatNpr(j.budgetMax)} · {j.proposalsCount} proposals
                  </p>
                </div>
                <Badge variant="outline" className="text-success border-success/30">Open</Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold mb-4">Saved providers</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {saved.map((p) => (
            <Link
              to="/providers/$slug"
              params={{ slug: p.slug }}
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 transition-colors"
            >
              <img src={p.avatar} alt={p.name} className="h-12 w-12 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tint: "primary" | "gold";
}) {
  return (
    <Card className="p-5">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${
        tint === "primary" ? "bg-primary/10 text-primary" : "bg-gold/15 text-gold-foreground"
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-display font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}

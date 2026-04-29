import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, DollarSign, Star, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { jobs, formatNpr, providers } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/worker")({
  head: () => ({ meta: [{ title: "Worker Dashboard — EventKraft" }] }),
  component: WorkerDashboard,
});

function WorkerDashboard() {
  const me = providers[0];
  const recommended = jobs.slice(0, 3);

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-center gap-4 flex-wrap">
        <img src={me.avatar} alt={me.name} className="h-16 w-16 rounded-full object-cover ring-2 ring-background shadow-soft" />
        <div className="flex-1">
          <h1 className="font-display text-3xl font-semibold">Welcome back, {me.name.split(" ")[0]}</h1>
          <p className="text-muted-foreground mt-1 text-sm">★ {me.rating} · {me.completedJobs} completed jobs</p>
        </div>
        <Button asChild className="bg-gradient-hero text-primary-foreground">
          <Link to="/providers/$slug" params={{ slug: me.slug }}>View public profile</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Briefcase} label="Active gigs" value="3" tint="primary" />
        <Stat icon={DollarSign} label="This month" value={formatNpr(225000)} tint="gold" />
        <Stat icon={Star} label="Avg rating" value={String(me.rating)} tint="gold" />
        <Stat icon={TrendingUp} label="Profile views" value="1,248" tint="primary" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Jobs matching your skills</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/jobs">Browse all jobs</Link>
          </Button>
        </div>
        <div className="space-y-3">
          {recommended.map((j) => (
            <Card key={j.id} className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <Link to="/jobs/$slug" params={{ slug: j.slug }} className="font-semibold hover:text-primary">
                    {j.title}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">
                    {j.location} · Budget {formatNpr(j.budgetMin)} – {formatNpr(j.budgetMax)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{j.proposalsCount} proposals</Badge>
                  <Button size="sm" asChild>
                    <Link to="/jobs/$slug" params={{ slug: j.slug }}>Apply</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-gradient-subtle border border-border p-6">
        <h3 className="font-display text-lg font-semibold">Pro tip</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Workers who reply to job postings within 1 hour are <span className="text-foreground font-semibold">3× more likely</span> to win the job.
        </p>
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

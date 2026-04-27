import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, FileText, Handshake, Star, ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it Works — EventKraft" },
      { name: "description", content: "Learn how EventKraft connects you with verified wedding & event professionals across Nepal." },
    ],
  }),
  component: HowItWorks,
});

const customerSteps = [
  { icon: Search, title: "Discover", desc: "Browse 350+ verified providers or post a job describing what you need." },
  { icon: FileText, title: "Compare", desc: "Review portfolios, packages and authentic customer reviews." },
  { icon: Handshake, title: "Book", desc: "Hire with confidence — payments are protected until work is delivered." },
  { icon: Star, title: "Celebrate", desc: "Enjoy your event and leave a review to help the community." },
];

const workerSteps = [
  { icon: FileText, title: "Create your gig", desc: "Build a beautiful profile with portfolio, packages and pricing." },
  { icon: Search, title: "Get discovered", desc: "Customers find you in search — or you find them on the jobs board." },
  { icon: Handshake, title: "Win work", desc: "Send proposals, chat with clients and confirm bookings." },
  { icon: Star, title: "Grow", desc: "Earn reviews, build reputation and unlock lower commission tiers." },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 py-20 text-center">
          <Sparkles className="h-8 w-8 text-gold mx-auto mb-4" />
          <h1 className="font-display text-4xl md:text-5xl font-semibold">
            How EventKraft works
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/85 max-w-2xl mx-auto">
            A transparent, trusted platform connecting customers and event
            professionals across Nepal.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-16 flex-1 space-y-20">
        {/* Customers */}
        <div>
          <p className="text-sm font-medium text-primary mb-2">For customers</p>
          <h2 className="font-display text-3xl font-semibold mb-10">
            Find the perfect provider in 4 steps
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {customerSteps.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft relative">
                <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-gradient-gold text-gold-foreground flex items-center justify-center font-display font-semibold text-sm shadow-gold">
                  {i + 1}
                </div>
                <s.icon className="h-7 w-7 text-primary mb-3" />
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{s.desc}</p>
              </div>
            ))}
          </div>
          <Button asChild className="mt-8 bg-gradient-hero text-primary-foreground">
            <Link to="/providers">Start browsing →</Link>
          </Button>
        </div>

        {/* Workers */}
        <div>
          <p className="text-sm font-medium text-primary mb-2">For workers</p>
          <h2 className="font-display text-3xl font-semibold mb-10">
            Grow your event business
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {workerSteps.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft relative">
                <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-gradient-hero text-primary-foreground flex items-center justify-center font-display font-semibold text-sm shadow-soft">
                  {i + 1}
                </div>
                <s.icon className="h-7 w-7 text-primary mb-3" />
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{s.desc}</p>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/signup">Join as a worker →</Link>
          </Button>
        </div>

        {/* Trust */}
        <div className="rounded-3xl bg-gradient-subtle p-10 md:p-14 border border-border">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <ShieldCheck className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-display text-xl font-semibold">Verified providers</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Every premium provider is identity-verified and portfolio-reviewed.
              </p>
            </div>
            <div>
              <Handshake className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-display text-xl font-semibold">Protected payments</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your money is held safely until the work is delivered to your satisfaction.
              </p>
            </div>
            <div>
              <Star className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-display text-xl font-semibold">Honest reviews</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Only verified customers can leave reviews — no fakes, no manipulation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

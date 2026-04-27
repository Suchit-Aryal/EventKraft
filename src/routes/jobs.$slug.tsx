import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, MapPin, Users, Clock, ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getJobBySlug, formatNpr, categories, providers } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/$slug")({
  loader: ({ params }) => {
    const job = getJobBySlug(params.slug);
    if (!job) throw notFound();
    return { job };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.job.title} — EventKraft` },
          { name: "description", content: loaderData.job.description },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center p-10 text-center">
        <div>
          <h1 className="font-display text-3xl">Job not found</h1>
          <Button asChild className="mt-4"><Link to="/jobs">Browse jobs</Link></Button>
        </div>
      </div>
      <SiteFooter />
    </div>
  ),
  component: JobDetail,
});

const sampleProposals = providers.slice(0, 3).map((p, i) => ({
  provider: p,
  price: 60000 + i * 15000,
  message:
    i === 0
      ? "Hi! I'd love to be part of your celebration. I have 8+ years covering Nepali weddings and can offer drone coverage at no extra cost."
      : i === 1
      ? "I have shot 30+ weddings in Kathmandu this year alone. Happy to share a curated portfolio matching your style."
      : "Would be honored to capture your day. I can deliver a teaser within 48 hours of the event.",
  days: i + 1,
}));

function JobDetail() {
  const { job } = Route.useLoaderData();
  const category = categories.find((c) => c.slug === job.category);
  const [proposalText, setProposalText] = useState("");
  const [bid, setBid] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Proposal submitted!", {
      description: "The customer will be notified.",
    });
    setProposalText("");
    setBid("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="container mx-auto px-4 lg:px-8 py-8 flex-1">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className="bg-accent text-accent-foreground">{category?.name}</Badge>
                <Badge variant="outline">{job.eventType}</Badge>
                <Badge variant="outline" className="ml-auto text-success border-success/30">
                  {job.status === "open" ? "Open" : job.status}
                </Badge>
              </div>

              <h1 className="font-display text-2xl md:text-3xl font-semibold leading-tight">
                {job.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {job.location}</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />
                  {new Date(job.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {job.proposalsCount} proposals</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Posted {job.postedDaysAgo}d ago</span>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h2 className="font-semibold mb-2">Description</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{job.description}</p>
              </div>
            </Card>

            <Card className="p-6 md:p-8">
              <h2 className="font-display text-xl font-semibold mb-4">Submit your proposal</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="bid">Your bid (NPR)</Label>
                  <Input
                    id="bid"
                    type="number"
                    placeholder={String(job.budgetMin)}
                    value={bid}
                    onChange={(e) => setBid(e.target.value)}
                    required
                    min={1000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Customer's budget: {formatNpr(job.budgetMin)} – {formatNpr(job.budgetMax)}
                  </p>
                </div>
                <div>
                  <Label htmlFor="msg">Cover letter</Label>
                  <Textarea
                    id="msg"
                    rows={5}
                    placeholder="Tell the customer why you're the perfect fit…"
                    value={proposalText}
                    onChange={(e) => setProposalText(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="bg-gradient-hero text-primary-foreground">
                  Send proposal
                </Button>
              </form>
            </Card>

            <div>
              <h2 className="font-display text-xl font-semibold mb-4">
                {sampleProposals.length} recent proposals
              </h2>
              <div className="space-y-3">
                {sampleProposals.map((p, i) => (
                  <Card key={i} className="p-5">
                    <div className="flex items-start gap-3">
                      <img src={p.provider.avatar} alt={p.provider.name} className="h-12 w-12 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <Link to="/providers/$slug" params={{ slug: p.provider.slug }} className="font-semibold hover:text-primary">
                            {p.provider.name}
                          </Link>
                          <span className="font-semibold text-primary">{formatNpr(p.price)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">★ {p.provider.rating} · {p.provider.completedJobs} jobs · {p.days}d ago</p>
                        <p className="mt-2 text-sm text-muted-foreground">{p.message}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <Card className="p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Budget</p>
              <p className="font-display text-2xl font-semibold mt-1">
                {formatNpr(job.budgetMin)} – {formatNpr(job.budgetMax)}
              </p>
              <div className="mt-5 pt-5 border-t border-border space-y-2 text-sm">
                <p className="text-muted-foreground">Posted by</p>
                <p className="font-semibold">{job.postedBy}</p>
              </div>
              <Button variant="outline" className="w-full mt-5">
                Save job
              </Button>
            </Card>

            <Card className="p-6 bg-gradient-subtle">
              <h3 className="font-semibold mb-2">Tips for a winning proposal</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>✓ Reference the customer's specific needs</li>
                <li>✓ Show a relevant portfolio link</li>
                <li>✓ Be transparent about pricing</li>
                <li>✓ Reply within 24 hours</li>
              </ul>
            </Card>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

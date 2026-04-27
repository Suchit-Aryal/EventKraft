import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Star, MapPin, BadgeCheck, Check, MessageSquare, Calendar, Award } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProviderBySlug, formatNpr } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/providers/$slug")({
  loader: ({ params }) => {
    const provider = getProviderBySlug(params.slug);
    if (!provider) throw notFound();
    return { provider };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.provider.name} — EventKraft` },
          { name: "description", content: loaderData.provider.bio },
          { property: "og:title", content: `${loaderData.provider.name} on EventKraft` },
          { property: "og:description", content: loaderData.provider.tagline },
          { property: "og:image", content: loaderData.provider.cover },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="text-center">
          <h1 className="font-display text-3xl">Provider not found</h1>
          <Button asChild className="mt-4"><Link to="/providers">Browse providers</Link></Button>
        </div>
      </div>
      <SiteFooter />
    </div>
  ),
  component: ProviderProfile,
});

function ProviderProfile() {
  const { provider } = Route.useLoaderData();
  const [selected, setSelected] = useState<number>(1);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Hero / portfolio */}
      <section className="bg-gradient-subtle border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="grid gap-3 md:grid-cols-4 md:grid-rows-2 md:h-[420px]">
            <div className="md:col-span-2 md:row-span-2 overflow-hidden rounded-2xl bg-muted">
              <img src={provider.portfolio[0]} alt="Portfolio" className="h-full w-full object-cover" />
            </div>
            {provider.portfolio.slice(1, 5).map((src, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-muted aspect-square md:aspect-auto">
                <img src={src} alt={`Portfolio ${i + 2}`} loading="lazy" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-10 flex-1">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* Left: details */}
          <div className="lg:col-span-2">
            <div className="flex items-start gap-4">
              <img src={provider.avatar} alt={provider.name} className="h-20 w-20 rounded-full object-cover ring-4 ring-background shadow-soft" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-3xl md:text-4xl font-semibold">{provider.name}</h1>
                  {provider.verified && (
                    <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">
                      <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Verified
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">{provider.tagline}</p>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-gold text-gold" />
                    <span className="font-semibold text-foreground">{provider.rating}</span>
                    ({provider.reviewCount} reviews)
                  </span>
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {provider.city}</span>
                  <span className="flex items-center gap-1.5"><Award className="h-4 w-4" /> {provider.completedJobs} completed</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed">{provider.bio}</p>
            </div>

            {/* Reviews */}
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold mb-4">
                Reviews ({provider.reviews.length})
              </h2>
              <div className="space-y-4">
                {provider.reviews.map((r, i) => (
                  <Card key={i} className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{r.author}</p>
                      <span className="text-xs text-muted-foreground">{r.date}</span>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={`h-3.5 w-3.5 ${j < r.rating ? "fill-gold text-gold" : "text-muted"}`} />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{r.body}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right: packages */}
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <Card className="p-1 overflow-hidden">
              <div className="grid grid-cols-3 bg-muted">
                {provider.packages.map((pkg, i) => (
                  <button
                    key={pkg.name}
                    onClick={() => setSelected(i)}
                    className={`px-3 py-2.5 text-xs font-semibold transition-colors ${
                      selected === i ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {pkg.name}
                  </button>
                ))}
              </div>

              <div className="p-5">
                <p className="text-3xl font-display font-semibold">
                  {formatNpr(provider.packages[selected].priceNpr)}
                </p>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {provider.packages[selected].duration}
                </p>

                <ul className="mt-5 space-y-2.5">
                  {provider.packages[selected].features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full mt-6 bg-gradient-hero text-primary-foreground"
                  size="lg"
                  onClick={() => toast.success("Booking request sent!", { description: `${provider.name} will reply within 24 hours.` })}
                >
                  Book {provider.packages[selected].name}
                </Button>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => toast("Message sent", { description: "We'll notify you of replies." })}
                >
                  <MessageSquare className="h-4 w-4 mr-2" /> Contact provider
                </Button>
              </div>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
              All payments are protected by EventKraft. You only pay when work is delivered.
            </p>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

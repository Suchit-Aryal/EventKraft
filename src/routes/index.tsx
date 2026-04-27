import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Sparkles, ShieldCheck, Star, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProviderCard } from "@/components/provider-card";
import { categories, providers } from "@/lib/mock-data";
import heroImage from "@/assets/hero-wedding.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const featured = providers.slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Nepali bride at golden hour wedding"
            width={1920}
            height={1080}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/70 to-primary/40" />
        </div>

        <div className="relative container mx-auto px-4 lg:px-8 py-24 md:py-36 lg:py-44">
          <div className="max-w-2xl text-primary-foreground">
            <div className="inline-flex items-center gap-2 rounded-full bg-background/15 backdrop-blur px-3 py-1 text-xs font-medium ring-1 ring-background/20 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              Nepal's premium event marketplace
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05]">
              Where premium talent meets{" "}
              <span className="text-gradient-gold">grand events</span>.
            </h1>

            <p className="mt-6 text-lg md:text-xl text-primary-foreground/90 max-w-xl">
              Hire verified photographers, videographers, decorators and artists
              for your wedding — or post a job and let proposals come to you.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild className="bg-gradient-gold text-gold-foreground hover:opacity-95 shadow-gold">
                <Link to="/providers">
                  Browse Providers <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="bg-background/10 backdrop-blur border-background/30 text-primary-foreground hover:bg-background/20"
              >
                <Link to="/post-job">Post a Job</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-primary-foreground/85">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold" /> Verified providers</span>
              <span className="flex items-center gap-2"><Star className="h-4 w-4 text-gold" /> 4.8 avg rating</span>
              <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-gold" /> 500+ happy weddings</span>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-sm font-medium text-primary mb-2">Service categories</p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold">
                Everything you need for the perfect day
              </h2>
            </div>
            <Link to="/providers" className="text-sm font-medium text-primary hover:underline">
              View all providers →
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to="/providers"
                search={{ category: c.slug }}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl shadow-soft"
              >
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/40 to-transparent" />
                <div className="absolute inset-0 p-5 flex flex-col justify-end text-primary-foreground">
                  <h3 className="font-display text-2xl font-semibold">{c.name}</h3>
                  <p className="text-sm text-primary-foreground/80 mt-1">{c.tagline}</p>
                  <p className="text-xs text-primary-foreground/70 mt-2">{c.count} providers</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="text-sm font-medium text-primary mb-2">How it works</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold">
              Two simple ways to find the perfect match
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground mb-4">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-semibold mb-3">Browse & Book</h3>
              <p className="text-muted-foreground mb-5">
                Explore portfolios, compare packages and book directly. Like
                Fiverr, but for weddings.
              </p>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>① Browse providers by category</li>
                <li>② Compare packages, reviews & portfolio</li>
                <li>③ Book the package that fits your event</li>
              </ol>
              <Button asChild variant="link" className="px-0 mt-4">
                <Link to="/providers">Browse providers →</Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold text-gold-foreground mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-semibold mb-3">Post & Hire</h3>
              <p className="text-muted-foreground mb-5">
                Describe your event and budget — workers send you proposals.
                Pick the best one.
              </p>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>① Post your event requirements</li>
                <li>② Receive proposals from qualified workers</li>
                <li>③ Shortlist and hire the perfect fit</li>
              </ol>
              <Button asChild variant="link" className="px-0 mt-4">
                <Link to="/post-job">Post a job →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-sm font-medium text-primary mb-2">Featured talent</p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold">
                Top-rated professionals this season
              </h2>
            </div>
            <Link to="/providers" className="text-sm font-medium text-primary hover:underline">
              See all →
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto rounded-3xl bg-gradient-hero text-primary-foreground p-10 md:p-14 shadow-elegant relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-gold/30 blur-3xl" />
            <Sparkles className="h-8 w-8 text-gold mb-4" />
            <blockquote className="font-display text-2xl md:text-3xl leading-snug">
              "EventKraft made finding our wedding photographer effortless. We
              compared 5 portfolios in an evening, booked Aarav, and the results
              were beyond our dreams."
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gold/30 flex items-center justify-center font-display font-semibold">R</div>
              <div>
                <p className="font-semibold">Riya & Manish Karki</p>
                <p className="text-sm text-primary-foreground/70">Married December 2024 · Kathmandu</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-semibold">
            Ready to plan an unforgettable event?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join hundreds of couples and event planners trusting EventKraft for
            their most important moments.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button size="lg" asChild className="bg-gradient-hero text-primary-foreground">
              <Link to="/signup">Create your account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/providers">Explore providers</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProviderCard } from "@/components/provider-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { categories, providers, type CategorySlug } from "@/lib/mock-data";
import { z } from "zod";

const searchSchema = z.object({
  category: z.enum(["photography", "videography", "decoration", "mehendi"]).optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/providers")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Browse Providers — EventKraft" },
      { name: "description", content: "Browse verified wedding & event service providers in Nepal." },
    ],
  }),
  component: ProvidersPage,
});

function ProvidersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(search.q ?? "");
  const [sort, setSort] = useState<"rating" | "price-asc" | "price-desc">("rating");

  const activeCategory = search.category;

  const filtered = useMemo(() => {
    let list = providers;
    if (activeCategory) list = list.filter((p) => p.category === activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    if (sort === "price-asc") sorted.sort((a, b) => a.startingPrice - b.startingPrice);
    if (sort === "price-desc") sorted.sort((a, b) => b.startingPrice - a.startingPrice);
    return sorted;
  }, [activeCategory, query, sort]);

  const setCategory = (c?: CategorySlug) => {
    navigate({ search: { category: c, q: query || undefined } });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="bg-gradient-subtle border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 py-12">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl md:text-4xl font-semibold">
              Browse premium event professionals
            </h1>
            <p className="mt-2 text-muted-foreground">
              {providers.length}+ verified providers across Nepal
            </p>
          </div>

          <div className="mt-6 flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, city or service…"
                className="pl-9 bg-background"
              />
            </div>
            <Button onClick={() => navigate({ search: { category: activeCategory, q: query || undefined } })}>
              Search
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={() => setCategory(undefined)}>
              <Badge variant={!activeCategory ? "default" : "outline"} className={!activeCategory ? "bg-primary" : ""}>
                All categories
              </Badge>
            </button>
            {categories.map((c) => (
              <button key={c.slug} onClick={() => setCategory(c.slug)}>
                <Badge
                  variant={activeCategory === c.slug ? "default" : "outline"}
                  className={activeCategory === c.slug ? "bg-primary" : "cursor-pointer"}
                >
                  {c.name}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-10 flex-1">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {filtered.length} provider{filtered.length === 1 ? "" : "s"} found
          </p>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="text-sm bg-background border border-input rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="rating">Top rated</option>
              <option value="price-asc">Price: Low to high</option>
              <option value="price-desc">Price: High to low</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground">No providers match your filters.</p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/providers">Clear filters</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

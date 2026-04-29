import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JobCard } from "@/components/job-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categories, jobs, type CategorySlug } from "@/lib/mock-data";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Browse Jobs — EventKraft" },
      { name: "description", content: "Find wedding and event jobs posted by customers in Nepal. Submit proposals and grow your business." },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CategorySlug | undefined>();

  const filtered = useMemo(() => {
    let list = jobs;
    if (cat) list = list.filter((j) => j.category === cat);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (j) => j.title.toLowerCase().includes(q) || j.location.toLowerCase().includes(q),
      );
    }
    return list;
  }, [query, cat]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="bg-gradient-subtle border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold">
                Open jobs
              </h1>
              <p className="mt-2 text-muted-foreground">
                Browse event jobs and submit proposals to win clients.
              </p>
            </div>
            <Button asChild className="bg-gradient-hero text-primary-foreground">
              <Link to="/post-job">Post a job</Link>
            </Button>
          </div>

          <div className="mt-6 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs by title or location…"
              className="pl-9 bg-background"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setCat(undefined)}>
              <Badge variant={!cat ? "default" : "outline"} className={!cat ? "bg-primary" : "cursor-pointer"}>
                All
              </Badge>
            </button>
            {categories.map((c) => (
              <button key={c.slug} onClick={() => setCat(c.slug)}>
                <Badge
                  variant={cat === c.slug ? "default" : "outline"}
                  className={cat === c.slug ? "bg-primary" : "cursor-pointer"}
                >
                  {c.name}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-10 flex-1">
        <p className="text-sm text-muted-foreground mb-6">
          {filtered.length} job{filtered.length === 1 ? "" : "s"} found
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground">No jobs match your filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

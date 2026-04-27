import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categories } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/post-job")({
  head: () => ({
    meta: [
      { title: "Post a Job — EventKraft" },
      { name: "description", content: "Post your event requirements and let qualified workers send you proposals." },
    ],
  }),
  component: PostJob,
});

function PostJob() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Job posted!", {
      description: "Workers will start sending proposals shortly.",
    });
    setSubmitting(false);
    navigate({ to: "/jobs" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="container mx-auto px-4 lg:px-8 py-12 flex-1 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-semibold">
            Post a job
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tell us what you need — workers will reach out within hours.
          </p>
        </div>

        <Card className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="title">Job title *</Label>
              <Input id="title" required placeholder="e.g. Wedding photographer for 3-day ceremony" />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="category">Service category *</Label>
                <select
                  id="category"
                  required
                  defaultValue=""
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="event">Event type *</Label>
                <select
                  id="event"
                  required
                  defaultValue=""
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="" disabled>Select event type</option>
                  <option>Wedding</option>
                  <option>Reception</option>
                  <option>Engagement</option>
                  <option>Mehendi</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                rows={6}
                required
                placeholder="Describe your event, expected guest count, special requests…"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="date">Event date *</Label>
                <Input id="date" type="date" required />
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input id="location" required placeholder="Kathmandu, Hyatt Regency" />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="bmin">Budget min (NPR) *</Label>
                <Input id="bmin" type="number" required min={1000} placeholder="50000" />
              </div>
              <div>
                <Label htmlFor="bmax">Budget max (NPR) *</Label>
                <Input id="bmax" type="number" required min={1000} placeholder="120000" />
              </div>
            </div>

            <div>
              <Label htmlFor="reqs">Special requirements (optional)</Label>
              <Textarea id="reqs" rows={3} placeholder="Drone coverage, specific style, language preferences…" />
            </div>

            <div className="pt-3 flex flex-wrap gap-3">
              <Button
                type="submit"
                size="lg"
                className="bg-gradient-hero text-primary-foreground"
                disabled={submitting}
              >
                {submitting ? "Posting…" : "Publish job"}
              </Button>
              <Button type="button" size="lg" variant="outline">
                Save as draft
              </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Posting is free. EventKraft charges a small service fee only when you hire.
            </p>
          </form>
        </Card>
      </section>

      <SiteFooter />
    </div>
  );
}

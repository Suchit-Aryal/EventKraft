import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Clock, Users } from "lucide-react";
import { type Job, formatNpr, categories } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function JobCard({ job }: { job: Job }) {
  const category = categories.find((c) => c.slug === job.category);

  return (
    <Link
      to="/jobs/$slug"
      params={{ slug: job.slug }}
      className="block group"
    >
      <Card className="p-5 border-border hover:shadow-soft hover:border-primary/30 transition-all duration-200">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="secondary" className="bg-accent text-accent-foreground">
            {category?.name}
          </Badge>
          <Badge variant="outline">{job.eventType}</Badge>
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Clock className="h-3 w-3" /> Posted {job.postedDaysAgo}d ago
          </span>
        </div>

        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
          {job.title}
        </h3>

        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {job.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {job.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(job.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {job.proposalsCount} proposals
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-sm">
            <span className="text-muted-foreground">Budget:</span>{" "}
            <span className="font-semibold">
              {formatNpr(job.budgetMin)} – {formatNpr(job.budgetMax)}
            </span>
          </span>
          <span className="text-sm font-medium text-primary group-hover:underline">
            View details →
          </span>
        </div>
      </Card>
    </Link>
  );
}

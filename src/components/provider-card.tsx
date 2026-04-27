import { Link } from "@tanstack/react-router";
import { Star, MapPin, BadgeCheck } from "lucide-react";
import { type Provider, formatNpr } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";

export function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <Link
      to="/providers/$slug"
      params={{ slug: provider.slug }}
      className="group block"
    >
      <Card className="overflow-hidden border-border hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={provider.cover}
            alt={`Work by ${provider.name}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {provider.verified && (
            <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-xs font-medium shadow-soft">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              Verified
            </div>
          )}
          <div className="absolute bottom-3 right-3 rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-gold text-gold" />
            {provider.rating}
            <span className="text-muted-foreground">({provider.reviewCount})</span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <img
              src={provider.avatar}
              alt={provider.name}
              loading="lazy"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-background"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate">{provider.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{provider.tagline}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" /> {provider.city}
            </span>
            <span className="text-muted-foreground">
              From <span className="font-semibold text-foreground">{formatNpr(provider.startingPrice)}</span>
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

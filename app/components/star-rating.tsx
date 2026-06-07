import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * Read-only row of 5 stars with fractional fill (e.g. 4.3 fills
 * four stars and 30% of the fifth).
 */
export function RatingStars({
  rating,
  className,
  starClassName,
}: {
  rating: number;
  className?: string;
  starClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fillFraction = Math.min(Math.max(rating - i, 0), 1);
        return (
          <span key={i} className="relative inline-flex">
            <Star
              className={cn("size-4 text-muted-foreground/40", starClassName)}
            />
            {fillFraction > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillFraction * 100}%` }}
              >
                <Star
                  className={cn(
                    "size-4 fill-amber-400 text-amber-400",
                    starClassName
                  )}
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Average rating + reviewer count, e.g. "★★★★☆ 4.3 (12)".
 * Renders nothing when there are no ratings yet.
 */
export function RatingSummary({
  averageRating,
  ratingCount,
  className,
}: {
  averageRating: number | null;
  ratingCount: number;
  className?: string;
}) {
  if (averageRating === null || ratingCount === 0) {
    return null;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <RatingStars rating={averageRating} />
      <span className="font-medium text-foreground">
        {averageRating.toFixed(1)}
      </span>
      <span className="text-muted-foreground">({ratingCount})</span>
    </span>
  );
}

/**
 * Interactive 5-star picker. Highlights stars up to the hovered star,
 * falling back to the current value.
 */
export function StarRatingInput({
  value,
  onRate,
  disabled,
}: {
  value: number | null;
  onRate: (rating: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const highlighted = hovered ?? value ?? 0;

  return (
    <div
      className="flex items-center gap-1"
      onMouseLeave={() => setHovered(null)}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={starValue}
            type="button"
            disabled={disabled}
            aria-label={`Rate ${starValue} star${starValue === 1 ? "" : "s"}`}
            onMouseEnter={() => setHovered(starValue)}
            onFocus={() => setHovered(starValue)}
            onBlur={() => setHovered(null)}
            onClick={() => onRate(starValue)}
            className="rounded-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <Star
              className={cn(
                "size-6 transition-colors",
                starValue <= highlighted
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
import { Star } from "lucide-react";

export default function Stars({ value, size = 14 }) {
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} fill={i <= Math.round(value) ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

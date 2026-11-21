import { useState } from "react";
import { Heart, Star } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { formatPrice } from "../api.js";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(product, product.sizes?.[0] || "", product.colors?.[0] || "");
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <article className="card">
      <div className="card-img">
        {product.discount_percent > 0 && <span className="tag">-{product.discount_percent}%</span>}
        <button
          className={`heart ${liked ? "on" : ""}`}
          onClick={() => setLiked(!liked)}
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} />
        </button>
        <img src={product.image_url} alt={product.name} loading="lazy" />
      </div>
      <div className="card-body">
        <h3>{product.name}</h3>
        <p className="price">
          {formatPrice(product.price)}
          {product.mrp && <s>{formatPrice(product.mrp)}</s>}
        </p>
        <p className="rating">
          <Star size={13} fill="currentColor" /> {product.rating} <span>({product.rating_count})</span>
        </p>
        <button className="btn btn-dark btn-block" onClick={handleAdd}>
          {added ? "Added" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
}

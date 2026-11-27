import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { formatPrice } from "../api.js";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [added, setAdded] = useState(false);

  const liked = has(product.id);
  const out = product.stock < 1;
  const variants = product.variants || [];
  const prices = variants.map((v) => Number(v.price));
  const priceVaries = prices.length > 0 && Math.min(...prices) !== Math.max(...prices);
  const needsOptions = variants.length > 0 || product.sizes?.length > 0;
  const page = `/product/${product.slug}`;

  const handleAdd = () => {
    addItem(product, "", product.colors?.[0] || "");
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <article className="card">
      <div className="card-img">
        {product.discount_percent > 0 && <span className="tag">-{product.discount_percent}%</span>}
        <button
          className={`heart ${liked ? "on" : ""}`}
          onClick={() => toggle(product.id)}
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={liked}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} />
        </button>
        <Link to={page} aria-label={product.name}>
          <img src={product.image_url} alt={product.name} loading="lazy" />
        </Link>
      </div>
      <div className="card-body">
        <h3><Link to={page}>{product.name}</Link></h3>
        <p className="price">
          {priceVaries && <small className="from">From </small>}
          {formatPrice(product.price)}
          {product.mrp && <s>{formatPrice(product.mrp)}</s>}
        </p>
        {product.rating_count > 0 && (
          <p className="rating">
            <Star size={13} fill="currentColor" /> {product.rating} <span>({product.rating_count})</span>
          </p>
        )}
        {out ? (
          <button className="btn btn-dark btn-block" disabled>Out of stock</button>
        ) : needsOptions ? (
          <Link to={page} className="btn btn-dark btn-block center">Select options</Link>
        ) : (
          <button className="btn btn-dark btn-block" onClick={handleAdd}>{added ? "Added" : "Add to Cart"}</button>
        )}
      </div>
    </article>
  );
}

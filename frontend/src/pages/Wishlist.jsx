import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useWishlist } from "../context/WishlistContext.jsx";
import ProductCard from "../components/ProductCard.jsx";

export default function Wishlist() {
  const { ids } = useWishlist();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    api(`/products/?ids=${ids.join(",")}`).then(setProducts).catch(() => setProducts([]));
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container section">
      <h1>My Wishlist</h1>
      <p className="muted">Saved on this device. Tap the heart on any product to add it here.</p>
      {products === null && <p className="muted">Loading...</p>}
      {products && products.length === 0 && (
        <div className="empty-page">
          <h2>Your wishlist is empty</h2>
          <Link to="/products" className="btn btn-dark">Browse products</Link>
        </div>
      )}
      {products && products.length > 0 && (
        <div className="product-grid" style={{ marginTop: 16 }}>
          {products.filter((p) => ids.includes(p.id)).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

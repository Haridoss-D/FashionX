import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Truck, ShieldCheck, Headphones } from "lucide-react";
import { api } from "../api.js";
import ProductCard from "../components/ProductCard.jsx";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/categories/"), api("/products/?featured=true")])
      .then(([c, p]) => {
        setCategories(c);
        setFeatured(p);
      })
      .catch(() => setError("Could not load products. Is the backend running?"));
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="hero-kicker">New Season Collection</p>
          <h1>
            Dress Your <br />
            <em>Own Story.</em>
          </h1>
          <p className="hero-sub">Trendy. Comfortable. You.</p>
          <Link to="/products" className="btn btn-dark">Shop Now</Link>
        </div>
      </section>

      <section className="container perks">
        <div><Truck size={26} /><span><b>Free Shipping</b> Above ₹999</span></div>
        <div><ShieldCheck size={26} /><span><b>Secure Payments</b> 100% Secure</span></div>
        <div><Headphones size={26} /><span><b>24/7 Support</b> Always Here</span></div>
      </section>

      <section className="container promo">
        <h2>Flat 50% OFF</h2>
        <p>on Selected Styles</p>
      </section>

      {error && <p className="container error">{error}</p>}

      <section className="container section">
        <div className="section-head">
          <h2>Shop by Category</h2>
          <Link to="/products">View All</Link>
        </div>
        <div className="cat-grid">
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`} className="cat-tile">
              <img src={c.image_url} alt="" loading="lazy" />
              <span>{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>Featured Products</h2>
          <Link to="/products">View All</Link>
        </div>
        <div className="product-grid">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </>
  );
}

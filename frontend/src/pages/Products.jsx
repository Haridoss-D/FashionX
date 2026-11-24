import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../api.js";
import ProductCard from "../components/ProductCard.jsx";

const SIZES = ["S", "M", "L", "XL"];
const COLORS = [
  { name: "Black", hex: "#111111" },
  { name: "Beige", hex: "#e6d3bf" },
  { name: "Gold", hex: "#c9a15b" },
  { name: "Blue", hex: "#5aa2f0" },
  { name: "Pink", hex: "#f08aa0" },
];

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(params.get("search") || "");
  const [maxPrice, setMaxPrice] = useState(5000);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");

  const selectedCats = (params.get("category") || "").split(",").filter(Boolean);
  const sort = params.get("sort") || "popularity";

  // The search box in the top menu changes ?search= in the address
  const urlSearch = params.get("search") || "";
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };

  const toggleCategory = (slug) => {
    const next = selectedCats.includes(slug) ? selectedCats.filter((s) => s !== slug) : [...selectedCats, slug];
    setParam("category", next.join(","));
  };

  useEffect(() => {
    api("/categories/").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const q = new URLSearchParams({ ordering: sort, max_price: maxPrice });
    if (selectedCats.length) q.set("category", selectedCats.join(","));
    if (search.trim()) q.set("search", search.trim());
    setLoading(true);
    setError("");
    api(`/products/?${q}`)
      .then(setProducts)
      .catch(() => setError("Could not load products. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [params, search, maxPrice]); // eslint-disable-line

  // Size and color are filtered in the browser (they are stored as lists)
  const visible = products.filter(
    (p) => (!size || p.sizes.includes(size)) && (!color || p.colors.includes(color))
  );

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Our Products</h1>
          <p>Trendy styles for every you</p>
        </div>
      </section>

      <div className="container shop-layout">
        <aside className="filters">
          <h2>Filters</h2>

          <h3>Category</h3>
          {categories.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" checked={selectedCats.includes(c.slug)} onChange={() => toggleCategory(c.slug)} />
              {c.name} <span>({c.product_count})</span>
            </label>
          ))}

          <h3>Price Range</h3>
          <input
            type="range" min="500" max="5000" step="100" value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))} aria-label="Maximum price"
          />
          <p className="muted">₹0 – ₹{maxPrice.toLocaleString("en-IN")}</p>

          <h3>Size</h3>
          <div className="chips">
            {SIZES.map((s) => (
              <button key={s} className={`chip ${size === s ? "on" : ""}`} onClick={() => setSize(size === s ? "" : s)}>
                {s}
              </button>
            ))}
          </div>

          <h3>Color</h3>
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                key={c.name} title={c.name} aria-label={c.name}
                className={`swatch ${color === c.name ? "on" : ""}`}
                style={{ background: c.hex }}
                onClick={() => setColor(color === c.name ? "" : c.name)}
              />
            ))}
          </div>
        </aside>

        <section className="shop-main">
          <div className="toolbar">
            <label className="search">
              <Search size={16} />
              <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <select value={sort} onChange={(e) => setParam("sort", e.target.value)} aria-label="Sort products">
              <option value="popularity">Sort by: Popularity</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {error && <p className="error">{error}</p>}
          {loading && <p className="muted">Loading products...</p>}
          {!loading && !error && visible.length === 0 && (
            <p className="empty">No products match these filters. Try removing one.</p>
          )}
          <div className="product-grid three">
            {visible.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Ban, Check, Heart, RotateCcw, Share2, Truck, Undo2, Wallet } from "lucide-react";
import { api, formatPrice } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { useDelivery } from "../hooks/useDelivery.js";
import { fmtDay, returnLabel } from "../utils.js";
import ProductCard from "../components/ProductCard.jsx";
import Reviews from "../components/Reviews.jsx";
import Stars from "../components/Stars.jsx";

const unique = (list) => [...new Set(list.filter(Boolean))];
const percentOff = (price, mrp) => (mrp && Number(mrp) > Number(price) ? Math.round(((mrp - price) / mrp) * 100) : 0);

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const delivery = useDelivery();

  const [product, setProduct] = useState(null);
  const [missing, setMissing] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [choiceError, setChoiceError] = useState("");
  const [added, setAdded] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [tab, setTab] = useState("features");

  const loadProduct = () => api(`/products/${slug}/`).then(setProduct);

  useEffect(() => {
    setProduct(null);
    setMissing(false);
    setSize("");
    setChoiceError("");
    window.scrollTo(0, 0);
    api(`/products/${slug}/`)
      .then((p) => {
        setProduct(p);
        const withStock = (p.variants || []).find((v) => v.stock > 0);
        setColor(withStock ? withStock.color : p.colors?.[0] || "");
      })
      .catch(() => setMissing(true));
    api(`/products/${slug}/similar/`).then(setSimilar).catch(() => setSimilar([]));
  }, [slug]);

  if (missing) {
    return (
      <div className="container empty-page">
        <h1>Product not found</h1>
        <p className="muted">It may have been removed.</p>
        <Link to="/products" className="btn btn-dark">Browse products</Link>
      </div>
    );
  }
  if (!product) return <p className="container empty">Loading...</p>;

  // ----- colours, sizes and prices -----
  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const colors = hasVariants ? unique(variants.map((v) => v.color)) : product.colors;
  const allSizes = hasVariants ? unique(variants.map((v) => v.size)) : product.sizes;
  const hasColors = colors.length > 0;
  const hasSizes = allSizes.length > 0;

  const forColor = hasVariants ? variants.filter((v) => !hasColors || v.color === color) : [];
  const selected = hasVariants
    ? variants.find((v) => v.color === (hasColors ? color : "") && v.size === (hasSizes ? size : ""))
    : null;
  const pool = forColor.length ? forColor : variants;

  let price = Number(product.price);
  let mrp = product.mrp ? Number(product.mrp) : null;
  let priceVaries = false;
  if (hasVariants) {
    const cheapest = selected || pool.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b));
    price = Number(cheapest.price);
    mrp = cheapest.mrp ? Number(cheapest.mrp) : null;
    priceVaries = !selected && new Set(pool.map((v) => Number(v.price))).size > 1;
  }
  const off = percentOff(price, mrp);

  const stock = selected ? selected.stock : hasVariants ? pool.reduce((n, v) => n + v.stock, 0) : product.stock;
  const out = stock < 1;
  const lowStock = (selected || !hasVariants) && stock > 0 && stock <= 5;

  const colorImage = (c) => variants.find((v) => v.color === c && v.image_url)?.image_url;
  const mainImage = selected?.image_url || colorImage(color) || product.image_url;

  const sizeOptions = hasVariants ? unique(forColor.map((v) => v.size)) : allSizes;
  const sizeAvailable = (s) => !hasVariants || forColor.some((v) => v.size === s && v.stock > 0);

  const pickColor = (c) => {
    setColor(c);
    setChoiceError("");
    if (hasVariants && !variants.some((v) => v.color === c && v.size === size && v.stock > 0)) setSize("");
  };

  const liked = has(product.id);
  const link = window.location.href;

  const addToCart = (thenCheckout) => {
    if (hasSizes && !size) return setChoiceError("Please choose a size first.");
    if (hasVariants && !selected) return setChoiceError("This colour and size is not available.");
    addItem(product, size, color, selected);
    if (thenCheckout) {
      navigate("/checkout");
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: `Check out ${product.name} on FashionX`, url: link });
      } catch {
        /* the person closed the share sheet */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setShareNote("Link copied");
    } catch {
      setShareNote(link);
    }
    setTimeout(() => setShareNote(""), 3000);
  };

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Check out ${product.name} on FashionX: ${link}`)}`;

  // ----- highlights and all details -----
  const featureLines = (product.features || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const tabs = [
    { id: "features", label: "Features", show: featureLines.length > 0 },
    { id: "specs", label: "Specifications", show: (product.specifications || []).length > 0 },
    { id: "maker", label: "Manufacturer info", show: Boolean((product.manufacturer_info || "").trim()) },
  ].filter((t) => t.show);
  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  return (
    <div className="container">
      <div className="pd">
        <div className="pd-image">
          {mainImage ? <img src={mainImage} alt={product.name} /> : <span>{product.name}</span>}
          <div className="pd-icons">
            <button
              className={`pd-icon ${liked ? "on" : ""}`} onClick={() => toggle(product.id)}
              aria-label={liked ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={liked}
            >
              <Heart size={20} fill={liked ? "currentColor" : "none"} />
            </button>
            <button className="pd-icon" onClick={share} aria-label="Share this product"><Share2 size={20} /></button>
          </div>
        </div>

        <div className="pd-info">
          <p className="muted"><Link to={`/products?category=${product.category_slug}`} className="underline">{product.category}</Link></p>
          <h1>{product.name}</h1>

          {product.rating_count > 0 ? (
            <p className="pd-rating"><Stars value={Number(product.rating)} /> <strong>{product.rating}</strong> <span className="muted">({product.rating_count} reviews)</span></p>
          ) : (
            <p className="muted">No reviews yet</p>
          )}

          <div className="pd-price">
            {off > 0 && <span className="pd-off">↓{off}%</span>}
            {mrp && <s>{formatPrice(mrp)}</s>}
            <strong>{priceVaries && <small className="from">From </small>}{formatPrice(price)}</strong>
          </div>
          {priceVaries && <p className="muted">The price changes with the {hasSizes ? "size" : "colour"} you choose.</p>}

          {hasColors && (
            <>
              <p className="pd-label">Color: <span className="muted">{color}</span></p>
              <div className="size-row" role="radiogroup" aria-label="Color">
                {colors.map((c) => {
                  const img = hasVariants ? colorImage(c) : "";
                  const soldOut = hasVariants && !variants.some((v) => v.color === c && v.stock > 0);
                  return (
                    <button
                      key={c} role="radio" aria-checked={color === c} title={c}
                      className={`size-btn ${img ? "thumb" : "wide"} ${color === c ? "on" : ""} ${soldOut ? "off" : ""}`}
                      onClick={() => pickColor(c)}
                    >
                      {img ? <img src={img} alt={c} /> : c}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {hasSizes && (
            <>
              <p className="pd-label">Select size</p>
              <div className="size-row" role="radiogroup" aria-label="Size">
                {sizeOptions.map((s) => {
                  const ok = sizeAvailable(s);
                  const chosen = hasVariants ? forColor.find((v) => v.size === s) : null;
                  return (
                    <button
                      key={s} role="radio" aria-checked={size === s} disabled={!ok}
                      className={`size-btn ${size === s ? "on" : ""} ${ok ? "" : "off"}`}
                      onClick={() => { setSize(s); setChoiceError(""); }}
                    >
                      {s}
                      {chosen && priceVaries && ok && <small className="size-price">{formatPrice(chosen.price)}</small>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {choiceError && <p className="error" role="alert">{choiceError}</p>}
          {lowStock && <p className="pd-low">Only {stock} left</p>}

          <div className="pd-actions">
            <button className="btn btn-outline-dark" disabled={out} onClick={() => addToCart(false)}>
              {out ? "Out of stock" : added ? <><Check size={16} /> Added</> : "Add to Cart"}
            </button>
            <button className="btn btn-buy" disabled={out} onClick={() => addToCart(true)}>Buy Now</button>
          </div>

          {(product.highlights || []).length > 0 && (
            <section aria-labelledby="hl">
              <h2 className="pd-h2" id="hl">Product highlights</h2>
              <dl className="highlights">
                {product.highlights.map((h, i) => (
                  <div key={i}><dt>{h.label}</dt><dd>{h.value}</dd></div>
                ))}
              </dl>
            </section>
          )}

          <h2 className="pd-h2">Delivery details</h2>
          <div className="pd-box">
            <div className="pd-row">
              <Truck size={20} />
              <div>
                {delivery ? (
                  <>
                    <strong>Delivery by {fmtDay(delivery.max)}</strong>
                    <br /><span className="muted">Usually {fmtDay(delivery.min)} to {fmtDay(delivery.max)}</span>
                  </>
                ) : <span className="muted">Checking delivery date...</span>}
              </div>
            </div>
            <div className="pd-row"><Wallet size={20} /><div>Cash on Delivery and online payment (UPI, cards, net banking)</div></div>
            <div className="pd-row"><span /><div className="muted">Free delivery on orders above ₹999, otherwise ₹99.</div></div>
          </div>

          <div className="chips-row">
            <span className="pill">
              {product.return_days > 0 ? <RotateCcw size={15} /> : <Ban size={15} />} {returnLabel(product.return_days)}
            </span>
            <span className="pill"><Undo2 size={15} /> Cancel within 24 hours</span>
          </div>

          <div className="chips-row">
            <a className="pill link" href={whatsapp} target="_blank" rel="noreferrer">Share on WhatsApp</a>
            <button className="pill link" onClick={share}>{shareNote || "Copy link"}</button>
          </div>
        </div>
      </div>

      {tabs.length > 0 && (
        <section className="pd-section">
          <h2 className="pd-h2">All details</h2>
          <div className="tabs" role="tablist" aria-label="All details">
            {tabs.map((t) => (
              <button
                key={t.id} role="tab" aria-selected={activeTab === t.id}
                className={activeTab === t.id ? "on" : ""} onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="tab-panel">
            {activeTab === "features" && <ul className="feature-list">{featureLines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
            {activeTab === "specs" && (
              <table className="spec-table">
                <tbody>
                  {product.specifications.map((s, i) => <tr key={i}><th scope="row">{s.label}</th><td>{s.value}</td></tr>)}
                </tbody>
              </table>
            )}
            {activeTab === "maker" && <p className="pd-desc">{product.manufacturer_info}</p>}
          </div>
        </section>
      )}

      <section className="pd-section">
        <h2 className="pd-h2">Description</h2>
        <p className="pd-desc">{product.description || "No description added yet."}</p>
        <p className="muted pd-policy">
          {product.return_days > 0
            ? `You can return this product within ${product.return_days} days of delivery if it is unused and in its original condition.`
            : "This product cannot be returned or exchanged."}
        </p>
      </section>

      <section className="pd-section">
        <h2 className="pd-h2">Ratings and reviews</h2>
        <Reviews slug={slug} onPosted={loadProduct} />
      </section>

      {similar.length > 0 && (
        <section className="pd-section">
          <h2 className="pd-h2">Similar products</h2>
          <div className="product-grid">
            {similar.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

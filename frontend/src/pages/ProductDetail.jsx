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
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState(false);
  const [shareNote, setShareNote] = useState("");

  const loadProduct = () => api(`/products/${slug}/`).then(setProduct);

  useEffect(() => {
    setProduct(null);
    setMissing(false);
    setSize("");
    setSizeError(false);
    window.scrollTo(0, 0);
    api(`/products/${slug}/`)
      .then((p) => {
        setProduct(p);
        setColor(p.colors?.[0] || "");
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

  const out = product.stock < 1;
  const needsSize = product.sizes.length > 0;
  const liked = has(product.id);
  const link = window.location.href;

  const addToCart = (thenCheckout) => {
    if (needsSize && !size) {
      setSizeError(true);
      return;
    }
    addItem(product, size, color);
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

  return (
    <div className="container">
      <div className="pd">
        <div className="pd-image">
          {product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>{product.name}</span>}
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
            {product.discount_percent > 0 && <span className="pd-off">↓{product.discount_percent}%</span>}
            {product.mrp && <s>{formatPrice(product.mrp)}</s>}
            <strong>{formatPrice(product.price)}</strong>
          </div>

          {product.colors.length > 0 && (
            <>
              <p className="pd-label">Color: <span className="muted">{color}</span></p>
              <div className="size-row">
                {product.colors.map((c) => (
                  <button key={c} className={`size-btn wide ${color === c ? "on" : ""}`} onClick={() => setColor(c)}>{c}</button>
                ))}
              </div>
            </>
          )}

          {needsSize && (
            <>
              <p className="pd-label">Select size</p>
              <div className="size-row" role="radiogroup" aria-label="Size">
                {product.sizes.map((s) => (
                  <button
                    key={s} role="radio" aria-checked={size === s}
                    className={`size-btn ${size === s ? "on" : ""}`}
                    onClick={() => { setSize(s); setSizeError(false); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {sizeError && <p className="error" role="alert">Please choose a size first.</p>}
            </>
          )}

          {!out && product.stock <= 5 && <p className="pd-low">Only {product.stock} left</p>}

          <div className="pd-actions">
            <button className="btn btn-outline-dark" disabled={out} onClick={() => addToCart(false)}>
              {out ? "Out of stock" : added ? <><Check size={16} /> Added</> : "Add to Cart"}
            </button>
            <button className="btn btn-buy" disabled={out} onClick={() => addToCart(true)}>Buy Now</button>
          </div>

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

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Headphones, Heart, Megaphone, Search, ShoppingCart, Store, User, X } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { CARE_LABEL } from "../siteConfig.js";

export default function Navbar() {
  const { count } = useCart();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [term, setTerm] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  // Close the More menu when clicking elsewhere or pressing Escape
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onClick = (e) => !moreRef.current?.contains(e.target) && setMoreOpen(false);
    const onKey = (e) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const submit = (e) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
    setSearching(false);
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo">
          FASHION<span>X</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/products">Shop</NavLink>
          <NavLink to="/track">Track Order</NavLink>
          <NavLink to="/products?sort=price_asc">Offers</NavLink>
          <a href="#about">About</a>
        </nav>
        <div className="nav-icons">
          <button onClick={() => setSearching(!searching)} aria-label={searching ? "Close search" : "Search products"}>
            {searching ? <X size={20} /> : <Search size={20} />}
          </button>
          <Link to="/wishlist" aria-label="Wishlist" className="cart-link">
            <Heart size={20} />
            {wishlist.count > 0 && <span className="badge">{wishlist.count}</span>}
          </Link>
          <Link to="/account" aria-label="My account"><User size={20} /></Link>

          <div className="more" ref={moreRef}>
            <button className="more-btn" aria-expanded={moreOpen} aria-haspopup="true" onClick={() => setMoreOpen(!moreOpen)}>
              More <ChevronDown size={16} className={moreOpen ? "flip" : ""} />
            </button>
            {moreOpen && (
              <div className="more-menu">
                <strong>More</strong>
                <Link to="/sell" onClick={() => setMoreOpen(false)}><Store size={18} /> Become a Seller</Link>
                <Link to="/notifications" onClick={() => setMoreOpen(false)}><Bell size={18} /> Notification Settings</Link>
                <Link to="/support" onClick={() => setMoreOpen(false)}><Headphones size={18} /> {CARE_LABEL}</Link>
                <Link to="/advertise" onClick={() => setMoreOpen(false)}><Megaphone size={18} /> Advertise on FashionX</Link>
              </div>
            )}
          </div>

          <Link to="/cart" aria-label="Cart" className="cart-link">
            <ShoppingCart size={20} />
            {count > 0 && <span className="badge">{count}</span>}
          </Link>
        </div>
      </div>
      {searching && (
        <form className="container nav-search" onSubmit={submit} role="search">
          <Search size={18} />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search for shirts, shoes, bags..."
            aria-label="Search products"
          />
          <button className="btn btn-dark" type="submit">Search</button>
        </form>
      )}
    </header>
  );
}

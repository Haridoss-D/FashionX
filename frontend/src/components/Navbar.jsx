import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Heart, Search, ShoppingCart, User, X } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";

export default function Navbar() {
  const { count } = useCart();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [term, setTerm] = useState("");

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

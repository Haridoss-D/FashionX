import { Link, NavLink } from "react-router-dom";
import { Search, User, ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";

export default function Navbar() {
  const { count } = useCart();
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo">
          FASHION<span>X</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/products">Shop</NavLink>
          <NavLink to="/products">Categories</NavLink>
          <NavLink to="/products?sort=price_asc">Offers</NavLink>
          <a href="#about">About</a>
        </nav>
        <div className="nav-icons">
          <Link to="/products" aria-label="Search"><Search size={20} /></Link>
          <Link to="/account" aria-label="My account"><User size={20} /></Link>
          <Link to="/cart" aria-label="Cart" className="cart-link">
            <ShoppingCart size={20} />
            {count > 0 && <span className="badge">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}

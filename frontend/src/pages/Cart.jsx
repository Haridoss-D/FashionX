import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { formatPrice } from "../api.js";
import OrderSummary from "../components/OrderSummary.jsx";

export default function Cart() {
  const { items, count, updateQty, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container empty-page">
        <h1>Your cart is empty</h1>
        <p className="muted">Add a few styles and they will show up here.</p>
        <Link to="/products" className="btn btn-dark">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="container checkout-layout">
      <section className="panel">
        <div className="panel-head">
          <h1>Your Cart ({count} {count === 1 ? "item" : "items"})</h1>
          <button className="link-danger" onClick={clearCart}>Clear Cart</button>
        </div>

        {items.map((i) => (
          <div className="cart-row" key={i.key}>
            <img src={i.image} alt={i.name} />
            <div className="cart-info">
              <h3>{i.name}</h3>
              <p className="muted">{[i.color, i.size].filter(Boolean).join(", ")}</p>
              <p className="price">{formatPrice(i.price)}</p>
            </div>
            <div className="qty">
              <button onClick={() => updateQty(i.key, i.qty - 1)} disabled={i.qty <= 1} aria-label="Decrease quantity"><Minus size={14} /></button>
              <span aria-live="polite">{i.qty}</span>
              <button onClick={() => updateQty(i.key, i.qty + 1)} aria-label="Increase quantity"><Plus size={14} /></button>
            </div>
            <strong className="line-total">{formatPrice(i.price * i.qty)}</strong>
            <button className="icon-btn" onClick={() => removeItem(i.key)} aria-label={`Remove ${i.name}`}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </section>

      <OrderSummary>
        <button className="btn btn-gold btn-block" onClick={() => navigate("/checkout")}>
          Proceed to Checkout
        </button>
        <Link to="/products" className="continue">Continue shopping</Link>
      </OrderSummary>
    </div>
  );
}

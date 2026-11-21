import { useCart } from "../context/CartContext.jsx";
import { formatPrice } from "../api.js";

export default function OrderSummary({ children }) {
  const { subtotal, shipping, total } = useCart();
  return (
    <div className="summary">
      <h2>Order Summary</h2>
      <dl>
        <div><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
        <div><dt>Shipping</dt><dd>{shipping === 0 ? "FREE" : formatPrice(shipping)}</dd></div>
        <div className="total"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
      </dl>
      {shipping > 0 && <p className="muted">Add {formatPrice(999 - subtotal)} more for free shipping.</p>}
      {children}
    </div>
  );
}

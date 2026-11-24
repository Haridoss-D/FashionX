import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, formatPrice } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fmtDateTime, fmtDay } from "../utils.js";

const STEPS = ["Order placed", "Shipped", "Delivered"];
const STEP_INDEX = { PENDING: 0, SHIPPED: 1, DELIVERED: 2 };

export default function TrackOrder() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [form, setForm] = useState({ order_number: params.get("order") || "", phone: "" });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async (body) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      setOrder(await api("/orders/track/", { method: "POST", body: JSON.stringify(body) }));
    } catch (err) {
      setOrder(null);
      setError(err.data?.detail || "Something went wrong. Please try again.");
    }
    setBusy(false);
  };

  // Logged-in customers who open an order from My Orders do not need to type their mobile number
  useEffect(() => {
    if (user && params.get("order")) lookup({ order_number: params.get("order") });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    lookup(form);
  };

  const cancel = async () => {
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api("/orders/cancel/", {
        method: "POST",
        body: JSON.stringify({ order_number: order.order_number, phone: form.phone }),
      });
      setOrder(updated);
      setNote(
        updated.payment_method === "ONLINE" && updated.payment_status === "PAID"
          ? "Your order is cancelled. The store will refund your payment to the original payment method."
          : "Your order is cancelled."
      );
    } catch (err) {
      setError(err.data?.detail || "Could not cancel this order.");
    }
    setBusy(false);
  };

  const done = order && order.status !== "CANCELLED";
  const step = order ? STEP_INDEX[order.status] : -1;

  return (
    <div className="container track">
      <h1>Track your order</h1>
      <form className="panel track-form" onSubmit={submit}>
        <label className="field">
          <span>Order number</span>
          <input
            value={form.order_number} placeholder="ORD12001" required
            onChange={(e) => setForm({ ...form, order_number: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Mobile number used for the order</span>
          <input
            value={form.phone} type="tel" inputMode="numeric" placeholder="10-digit number" required={!user}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <button className="btn btn-dark" type="submit" disabled={busy}>{busy ? "Please wait..." : "Track order"}</button>
        {user && <p className="muted">You are logged in, so the mobile number is optional for your own orders.</p>}
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {note && <p className="ok" role="status">{note}</p>}

      {order && (
        <div className="panel track-result">
          <div className="order-top">
            <div>
              <strong>#{order.order_number}</strong>
              <span className="muted"> · placed {fmtDateTime(order.created_at)}</span>
            </div>
            <span className={`status status-${order.status.toLowerCase()}`}>{order.status.charAt(0) + order.status.slice(1).toLowerCase()}</span>
          </div>

          {done ? (
            <ol className="timeline" aria-label="Order progress">
              {STEPS.map((s, i) => <li key={s} className={i <= step ? "done" : ""}>{s}</li>)}
            </ol>
          ) : (
            <p className="muted">This order was cancelled.</p>
          )}

          {done && order.status !== "DELIVERED" && order.estimated_delivery && (
            <p><strong>Deliver by {fmtDay(order.estimated_delivery)}</strong> <span className="muted">to {order.city}</span></p>
          )}

          <div className="order-details">
            {order.items.map((i, n) => (
              <div key={n} className="order-line">
                <span>{i.name} <span className="muted">{[i.color, i.size].filter(Boolean).join(", ")}</span> × {i.quantity}</span>
                <span>{formatPrice(i.price * i.quantity)}</span>
              </div>
            ))}
            <div className="order-line muted"><span>Shipping</span><span>{Number(order.shipping) === 0 ? "FREE" : formatPrice(order.shipping)}</span></div>
            <div className="order-line"><strong>Total</strong><strong>{formatPrice(order.total)}</strong></div>
            <div className="order-line muted">
              <span>Payment</span>
              <span>{order.payment_method === "COD" ? "Cash on Delivery" : order.payment_status === "PAID" ? "Paid online" : "Online (unpaid)"}</span>
            </div>
          </div>

          {order.can_cancel ? (
            <div className="cancel-box">
              <p>You can cancel this order until <strong>{fmtDateTime(order.cancel_until)}</strong>.</p>
              <button className="btn-outline danger" onClick={cancel} disabled={busy}>Cancel order</button>
            </div>
          ) : order.status === "PENDING" ? (
            <p className="muted">The 24-hour cancellation window has ended for this order.</p>
          ) : order.status === "SHIPPED" ? (
            <p className="muted">Shipped orders cannot be cancelled. After delivery, follow the return policy shown on each product.</p>
          ) : null}
        </div>
      )}

      <p className="muted"><Link to="/products" className="underline">Continue shopping</Link></p>
    </div>
  );
}

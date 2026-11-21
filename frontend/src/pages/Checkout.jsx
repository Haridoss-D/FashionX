import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { loadRazorpay } from "../razorpay.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import OrderSummary from "../components/OrderSummary.jsx";

const EMPTY = { full_name: "", email: "", phone: "", address: "", city: "", state: "", pin_code: "" };

function Field({ label, name, form, setForm, errors, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        aria-invalid={Boolean(errors[name])}
        required
        {...props}
      />
      {errors[name] && <em className="field-error">{errors[name]}</em>}
    </label>
  );
}

const first = (v) => (Array.isArray(v) ? (typeof v[0] === "string" ? v[0] : "") : v);

export default function Checkout() {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [payment, setPayment] = useState("ONLINE");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Fill in name, email and mobile for logged-in customers (never overwrites what they typed)
  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, full_name: f.full_name || user.full_name, email: f.email || user.email, phone: f.phone || user.phone }));
    }
  }, [user]);

  if (items.length === 0) return <Navigate to="/cart" replace />;

  const finish = (order, method) => {
    navigate(`/order-success/${order.order_number}`, { state: { total: order.total, method } });
    clearCart();
  };

  const cancelPayment = (razorpayOrderId) =>
    api("/payments/cancel/", { method: "POST", body: JSON.stringify({ razorpay_order_id: razorpayOrderId }) }).catch(() => {});

  const openPayWindow = async (order) => {
    const loaded = await loadRazorpay();
    if (!loaded) {
      await cancelPayment(order.razorpay_order_id);
      setFormError("Could not load the payment window. Check your internet connection and try again.");
      setSaving(false);
      return;
    }

    let paid = false;
    const rzp = new window.Razorpay({
      key: order.razorpay_key_id,
      amount: Math.round(Number(order.total) * 100),
      currency: "INR",
      name: "FashionX",
      description: `Order ${order.order_number}`,
      order_id: order.razorpay_order_id,
      prefill: { name: form.full_name, email: form.email, contact: form.phone },
      theme: { color: "#c19a5b" },
      handler: async (response) => {
        paid = true;
        try {
          await api("/payments/verify/", { method: "POST", body: JSON.stringify(response) });
          finish(order, "ONLINE");
        } catch {
          setFormError(
            `We received your payment but could not confirm it yet. Please do not pay again. ` +
              `Contact support with order number ${order.order_number}.`
          );
          setSaving(false);
        }
      },
      modal: {
        ondismiss: async () => {
          if (paid) return;
          await cancelPayment(order.razorpay_order_id);
          setFormError("Payment cancelled. Your cart is saved, so you can try again.");
          setSaving(false);
        },
      },
    });
    rzp.open();
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setFormError("");
    setSaving(true);

    let order;
    try {
      order = await api("/orders/", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          payment_method: payment,
          items: items.map((i) => ({ product_id: i.id, quantity: i.qty, size: i.size, color: i.color })),
        }),
      });
    } catch (err) {
      const d = err.data || {};
      const fieldErrors = {};
      Object.keys(EMPTY).forEach((k) => d[k] && (fieldErrors[k] = first(d[k])));
      setErrors(fieldErrors);
      setFormError(
        first(d.items) || first(d.payment_method) || d.detail ||
          (Object.keys(fieldErrors).length ? "Please fix the highlighted fields." : "Something went wrong. Please try again.")
      );
      setSaving(false);
      return;
    }

    if (payment === "COD") {
      finish(order, "COD");
    } else {
      await openPayWindow(order);
    }
  };

  const shared = { form, setForm, errors };

  return (
    <form className="container checkout-layout" onSubmit={submit}>
      <section className="panel">
        <h1>Checkout</h1>
        {!user && (
          <p className="muted">
            Have an account? <Link to="/login" state={{ from: "/checkout" }} className="underline">Log in</Link> to
            track this order and skip typing your details.
          </p>
        )}

        <h2 className="step">1. Shipping Address</h2>
        <div className="form-grid">
          <div className="span-2"><Field label="Full name" name="full_name" autoComplete="name" {...shared} /></div>
          <Field label="Email" name="email" type="email" autoComplete="email" {...shared} />
          <Field label="Mobile number" name="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="10-digit number" {...shared} />
          <div className="span-2"><Field label="Address" name="address" autoComplete="street-address" {...shared} /></div>
          <Field label="City" name="city" autoComplete="address-level2" {...shared} />
          <Field label="State" name="state" autoComplete="address-level1" {...shared} />
          <Field label="PIN code" name="pin_code" inputMode="numeric" maxLength={6} autoComplete="postal-code" {...shared} />
        </div>

        <h2 className="step">2. Payment Method</h2>
        <label className={`pay-option ${payment === "ONLINE" ? "on" : ""}`}>
          <input type="radio" name="pay" value="ONLINE" checked={payment === "ONLINE"} onChange={() => setPayment("ONLINE")} />
          <span>Online Payment (Razorpay) <small>UPI, cards, net banking and wallets.</small></span>
        </label>
        <label className={`pay-option ${payment === "COD" ? "on" : ""}`}>
          <input type="radio" name="pay" value="COD" checked={payment === "COD"} onChange={() => setPayment("COD")} />
          <span>Cash on Delivery <small>Pay when your order arrives.</small></span>
        </label>
      </section>

      <OrderSummary>
        {formError && <p className="error" role="alert">{formError}</p>}
        <button className="btn btn-dark btn-block" type="submit" disabled={saving}>
          {saving ? "Please wait..." : payment === "ONLINE" ? "Pay Now" : "Place Order"}
        </button>
        <Link to="/cart" className="continue">Back to cart</Link>
      </OrderSummary>
    </form>
  );
}

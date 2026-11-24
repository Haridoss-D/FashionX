import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Heart, LogOut, Package, User } from "lucide-react";
import { api, firstError, formatPrice } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_LABEL = { PENDING: "Pending", SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled" };

function ProfileForm({ user }) {
  const { updateProfile } = useAuth();
  const [form, setForm] = useState({ full_name: user.full_name, email: user.email, phone: user.phone });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage("");
    setSaving(true);
    try {
      await updateProfile(form);
      setMessage("Profile updated.");
    } catch (err) {
      const d = err.data || {};
      const fieldErrors = {};
      ["full_name", "email", "phone"].forEach((k) => d[k] && (fieldErrors[k] = firstError(d[k])));
      setErrors(fieldErrors);
      setMessage(Object.keys(fieldErrors).length ? "" : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <label className="field">
      <span>{label}</span>
      <input value={form[name]} onChange={set(name)} required aria-invalid={Boolean(errors[name])} {...props} />
      {errors[name] && <em className="field-error">{errors[name]}</em>}
    </label>
  );

  return (
    <form onSubmit={submit} className="profile-form">
      <h1>My Profile</h1>
      <p className="muted">Update your personal information</p>
      {field("full_name", "Full name", { autoComplete: "name" })}
      {field("email", "Email address", { type: "email", autoComplete: "email" })}
      {field("phone", "Phone number", { type: "tel", inputMode: "numeric", autoComplete: "tel" })}
      <button className="btn btn-gold" type="submit" disabled={saving}>{saving ? "Saving..." : "Update Profile"}</button>
      {message && <p role="status" className={message === "Profile updated." ? "ok" : "error"}>{message}</p>}
    </form>
  );
}

function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api("/orders/mine/").then(setOrders).catch(() => setError("Could not load your orders."));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!orders) return <p className="muted">Loading your orders...</p>;

  return (
    <>
      <h1>My Orders</h1>
      {orders.length === 0 && (
        <p className="empty">
          You have no orders yet. <Link to="/products" className="underline">Start shopping</Link>
        </p>
      )}
      {orders.map((o) => (
        <div className="order-card" key={o.order_number}>
          <div className="order-top">
            <div>
              <strong>#{o.order_number}</strong>
              <span className="muted">
                {" "}· {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <span className={`status status-${o.status.toLowerCase()}`}>{STATUS_LABEL[o.status] || o.status}</span>
            <strong>{formatPrice(o.total)}</strong>
            <Link className="btn-outline" to={`/track?order=${o.order_number}`}>Track</Link>
            <button className="btn-outline" onClick={() => setOpen(open === o.order_number ? null : o.order_number)}>
              {open === o.order_number ? "Hide Details" : "View Details"}
            </button>
          </div>
          {open === o.order_number && (
            <div className="order-details">
              {o.items.map((i, idx) => (
                <div key={idx} className="order-line">
                  <span>
                    {i.name} <span className="muted">{[i.color, i.size].filter(Boolean).join(", ")}</span> × {i.quantity}
                  </span>
                  <span>{formatPrice(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="order-line muted"><span>Shipping</span><span>{Number(o.shipping) === 0 ? "FREE" : formatPrice(o.shipping)}</span></div>
              <div className="order-line muted">
                <span>Payment</span>
                <span>{o.payment_method === "COD" ? "Cash on Delivery" : o.payment_status === "PAID" ? "Paid online" : "Online (unpaid)"}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export default function Account() {
  const { user, ready, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "orders" ? "orders" : "profile";

  if (!ready) return <p className="container empty">Loading...</p>;
  if (!user) return <Navigate to="/login" state={{ from: "/account" }} replace />;

  return (
    <div className="container account-layout">
      <aside className="panel account-side">
        <div className="avatar" aria-hidden="true">{(user.full_name || user.email || user.username || "U")[0].toUpperCase()}</div>
        <strong>{user.full_name || user.username}</strong>
        <small className="muted">{user.email}</small>
        <nav aria-label="Account">
          <button className={tab === "profile" ? "on" : ""} onClick={() => setParams({})}><User size={16} /> My Profile</button>
          <button className={tab === "orders" ? "on" : ""} onClick={() => setParams({ tab: "orders" })}><Package size={16} /> My Orders</button>
          <Link to="/wishlist"><Heart size={16} /> Wishlist</Link>
          <button onClick={logout}><LogOut size={16} /> Logout</button>
        </nav>
      </aside>
      <section className="panel">
        {tab === "profile" ? <ProfileForm key={user.email + user.phone} user={user} /> : <Orders />}
      </section>
    </div>
  );
}

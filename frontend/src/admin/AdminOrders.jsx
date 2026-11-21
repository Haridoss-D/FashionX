import { Fragment, useEffect, useState } from "react";
import { api, firstError, formatPrice } from "../api.js";

const STATUSES = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"];
const LABEL = { PENDING: "Pending", SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled" };
const PAY_LABEL = { PENDING: "Unpaid", PAID: "Paid", FAILED: "Failed" };

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = new URLSearchParams();
    if (filter) q.set("status", filter);
    if (search.trim()) q.set("search", search.trim());
    const t = setTimeout(() => {
      api(`/admin/orders/?${q}`).then(setOrders).catch(() => setError("Could not load orders."));
    }, 250); // wait while typing
    return () => clearTimeout(t);
  }, [filter, search]);

  const update = async (order, changes) => {
    if (changes.status === "CANCELLED" && !window.confirm(`Cancel ${order.order_number}? Its stock goes back to the shop.`)) return;
    setError("");
    try {
      const saved = await api(`/admin/orders/${order.id}/`, { method: "PATCH", body: JSON.stringify(changes) });
      setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, ...saved } : o)));
    } catch (err) {
      setError(firstError(err.data?.status) || firstError(err.data?.payment_status) || "Could not update the order.");
    }
  };

  return (
    <>
      <h1>Orders</h1>
      <div className="adm-toolbar">
        <input placeholder="Search order #, name or phone" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search orders" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
        </select>
      </div>
      {error && <p className="adm-error" role="alert">{error}</p>}
      {!orders ? <p>Loading...</p> : (
        <div className="adm-card adm-scroll">
          <table className="adm-table">
            <thead><tr><th>Order #</th><th>Date</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan="7" className="adm-muted">No orders found.</td></tr>}
              {orders.map((o) => (
                <Fragment key={o.id}>
                  <tr>
                    <td>{o.order_number}</td>
                    <td>{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                    <td>{o.full_name}<br /><small className="adm-muted">{o.phone}</small></td>
                    <td>{formatPrice(o.total)}</td>
                    <td>
                      <small>{o.payment_method === "COD" ? "COD" : "Online"}</small><br />
                      <select value={o.payment_status} onChange={(e) => update(o, { payment_status: e.target.value })} aria-label={`Payment status of ${o.order_number}`}>
                        {Object.keys(PAY_LABEL).map((p) => <option key={p} value={p}>{PAY_LABEL[p]}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={o.status} disabled={o.status === "CANCELLED"} onChange={(e) => update(o, { status: e.target.value })} aria-label={`Status of ${o.order_number}`}>
                        {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td><button className="adm-btn-sm" onClick={() => setOpen(open === o.id ? null : o.id)}>{open === o.id ? "Hide" : "Details"}</button></td>
                  </tr>
                  {open === o.id && (
                    <tr className="adm-detail">
                      <td colSpan="7">
                        <p><strong>Ship to:</strong> {o.full_name}, {o.address}, {o.city}, {o.state} {o.pin_code} · {o.email}</p>
                        {o.items.map((i, n) => (
                          <p key={n}>{i.name} {[i.color, i.size].filter(Boolean).join(", ") && `(${[i.color, i.size].filter(Boolean).join(", ")})`} × {i.quantity} · {formatPrice(i.price * i.quantity)}</p>
                        ))}
                        <p className="adm-muted">Subtotal {formatPrice(o.subtotal)} · Shipping {formatPrice(o.shipping)} · Total {formatPrice(o.total)}</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

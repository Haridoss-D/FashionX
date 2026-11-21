import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../api.js";

const STATUS = { PENDING: "Pending", SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled" };

function SalesChart({ data }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const W = 520, H = 200, pad = 28, bar = 44;
  const gap = (W - pad * 2 - bar * data.length) / (data.length - 1 || 1);
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label="Revenue for the last 6 months" className="adm-chart">
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1={pad} x2={W - pad} y1={H - t * (H - 20)} y2={H - t * (H - 20)} stroke="#e7e2d9" />
      ))}
      {data.map((d, i) => {
        const h = (d.total / max) * (H - 30);
        const x = pad + i * (bar + gap);
        return (
          <g key={d.label + i}>
            <rect x={x} y={H - h} width={bar} height={h} rx="4" fill="#c19a5b" />
            {d.total > 0 && <text x={x + bar / 2} y={H - h - 6} textAnchor="middle" fontSize="11" fill="#444">{formatPrice(d.total)}</text>}
            <text x={x + bar / 2} y={H + 16} textAnchor="middle" fontSize="12" fill="#6b6b73">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/admin/stats/").then(setStats).catch(() => setError("Could not load the dashboard."));
  }, []);

  if (error) return <p className="adm-error">{error}</p>;
  if (!stats) return <p>Loading...</p>;

  const cards = [
    ["Total Products", stats.products, "blue"],
    ["Total Customers", stats.customers, "green"],
    ["Total Orders", stats.orders, "purple"],
    ["Revenue (paid)", formatPrice(stats.revenue), "orange"],
  ];

  return (
    <>
      <h1>Dashboard</h1>
      <div className="adm-stats">
        {cards.map(([label, value, tone]) => (
          <div key={label} className={`adm-stat ${tone}`}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="adm-grid">
        <section className="adm-card">
          <div className="adm-head"><h2>Recent Orders</h2><Link to="/admin/orders" className="adm-link">View All</Link></div>
          <div className="adm-scroll">
            <table className="adm-table">
              <thead><tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {stats.recent_orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.order_number}</td><td>{o.full_name}</td><td>{formatPrice(o.total)}</td>
                    <td><span className={`status status-${o.status.toLowerCase()}`}>{STATUS[o.status]}</span></td>
                  </tr>
                ))}
                {stats.recent_orders.length === 0 && <tr><td colSpan="4" className="adm-muted">No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-head"><h2>Sales Overview</h2><span className="adm-muted">Last 6 months</span></div>
          <SalesChart data={stats.sales} />
        </section>
      </div>
    </>
  );
}

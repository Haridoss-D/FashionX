import { useEffect, useState } from "react";
import { api, formatPrice } from "../api.js";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/admin/customers/").then(setCustomers).catch(() => setError("Could not load customers."));
  }, []);

  if (error) return <p className="adm-error">{error}</p>;
  if (!customers) return <p>Loading...</p>;

  const term = search.trim().toLowerCase();
  const shown = customers.filter((c) => !term || [c.name, c.email, c.phone, c.city].some((v) => v?.toLowerCase().includes(term)));

  return (
    <>
      <h1>Customers</h1>
      <div className="adm-toolbar">
        <input placeholder="Search name, email, phone or city" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" />
      </div>
      <div className="adm-card adm-scroll">
        <table className="adm-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Orders</th><th>Total spent</th><th>Last order</th></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan="7" className="adm-muted">No customers found.</td></tr>}
            {shown.map((c) => (
              <tr key={c.phone}>
                <td>{c.name}</td><td>{c.phone}</td><td>{c.email}</td><td>{c.city}</td>
                <td>{c.orders}</td><td>{formatPrice(c.total_spent)}</td>
                <td>{new Date(c.last_order).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

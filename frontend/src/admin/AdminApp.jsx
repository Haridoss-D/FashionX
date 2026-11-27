import { useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { Inbox, LayoutDashboard, LogOut, Package, ShoppingBag, Store, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import Dashboard from "./Dashboard.jsx";
import AdminProducts from "./AdminProducts.jsx";
import AdminOrders from "./AdminOrders.jsx";
import AdminCustomers from "./AdminCustomers.jsx";
import AdminEnquiries from "./AdminEnquiries.jsx";
import "./admin.css";

function AdminLogin({ login }) {
  const [form, setForm] = useState({ id: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await login(form.id, form.password);
    } catch (err) {
      setError(err.data?.detail || "Could not log in. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="adm-center">
      <form className="adm-card adm-login" onSubmit={submit}>
        <div className="adm-brand">FASHION<span>X</span><small>Admin Panel</small></div>
        <label className="adm-field">
          <span>Username or email</span>
          <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} autoComplete="username" required />
        </label>
        <label className="adm-field">
          <span>Password</span>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
        </label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button className="adm-btn" type="submit" disabled={saving}>{saving ? "Please wait..." : "Log in"}</button>
        <Link to="/" className="adm-link">Back to shop</Link>
      </form>
    </div>
  );
}

export default function AdminApp() {
  const { user, ready, login, logout } = useAuth();

  if (!ready) return <div className="adm-center"><p>Loading...</p></div>;
  if (!user) return <AdminLogin login={login} />;
  if (!user.is_staff) {
    return (
      <div className="adm-center">
        <div className="adm-card adm-login">
          <h1>No access</h1>
          <p>This account is not an admin account.</p>
          <button className="adm-btn" onClick={logout}>Log out</button>
          <Link to="/" className="adm-link">Back to shop</Link>
        </div>
      </div>
    );
  }

  const link = ({ isActive }) => (isActive ? "on" : "");
  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <div className="adm-brand">FASHION<span>X</span><small>Admin Panel</small></div>
        <nav aria-label="Admin">
          <NavLink to="/admin" end className={link}><LayoutDashboard size={16} /> Dashboard</NavLink>
          <NavLink to="/admin/products" className={link}><Package size={16} /> Products</NavLink>
          <NavLink to="/admin/orders" className={link}><ShoppingBag size={16} /> Orders</NavLink>
          <NavLink to="/admin/customers" className={link}><Users size={16} /> Customers</NavLink>
          <NavLink to="/admin/enquiries" className={link}><Inbox size={16} /> Enquiries</NavLink>
          <Link to="/"><Store size={16} /> View shop</Link>
          <button onClick={logout}><LogOut size={16} /> Logout</button>
        </nav>
      </aside>
      <main className="adm-main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="enquiries" element={<AdminEnquiries />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}

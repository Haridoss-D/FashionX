import { useEffect, useState } from "react";
import { api, firstError, formatPrice } from "../api.js";

const BLANK = {
  name: "", category: "", price: "", mrp: "", image_url: "", sizes: "", colors: "",
  stock: 0, return_days: 7, description: "", is_featured: false, is_active: true,
};

function ProductForm({ product, categories, onSaved, onCancel }) {
  const [form, setForm] = useState(
    product
      ? { ...BLANK, ...product, mrp: product.mrp ?? "", sizes: product.sizes.join(", "), colors: product.colors.join(", ") }
      : { ...BLANK, category: categories[0]?.id ?? "" }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (name) => (e) =>
    setForm({ ...form, [name]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const list = (text) => text.split(",").map((v) => v.trim()).filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const body = {
      name: form.name, category: Number(form.category), price: form.price,
      mrp: form.mrp === "" ? null : form.mrp, image_url: form.image_url,
      sizes: list(form.sizes), colors: list(form.colors), stock: Number(form.stock),
      return_days: Number(form.return_days), description: form.description,
      is_featured: form.is_featured, is_active: form.is_active,
    };
    try {
      await api(product ? `/admin/products/${product.id}/` : "/admin/products/", {
        method: product ? "PATCH" : "POST", body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      const d = err.data || {};
      const fe = {};
      Object.keys(d).forEach((k) => (fe[k] = firstError(d[k])));
      setErrors(Object.keys(fe).length ? fe : { form: "Could not save the product." });
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <label className="adm-field">
      <span>{label}</span>
      <input value={form[name]} onChange={set(name)} {...props} />
      {errors[name] && <em className="adm-error">{errors[name]}</em>}
    </label>
  );

  return (
    <form className="adm-card adm-form" onSubmit={submit}>
      <h2>{product ? "Edit product" : "Add product"}</h2>
      <div className="adm-form-grid">
        {field("name", "Name", { required: true })}
        <label className="adm-field">
          <span>Category</span>
          <select value={form.category} onChange={set("category")} required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {field("price", "Selling price (₹)", { type: "number", min: 1, step: "0.01", required: true })}
        {field("mrp", "Original price (₹), only if on sale", { type: "number", min: 1, step: "0.01" })}
        {field("stock", "Stock", { type: "number", min: 0, required: true })}
        <label className="adm-field">
          <span>Returns</span>
          <select value={form.return_days} onChange={set("return_days")}>
            <option value={0}>No returns</option>
            <option value={7}>7-day returns</option>
            <option value={15}>15-day returns</option>
            <option value={30}>30-day returns</option>
          </select>
        </label>
        {field("image_url", "Image link (https://...)", { type: "url" })}
        {field("sizes", "Sizes, separated by commas (S, M, L)")}
        {field("colors", "Colors, separated by commas (Black, Beige)")}
      </div>
      <label className="adm-field">
        <span>Description</span>
        <textarea rows="3" value={form.description} onChange={set("description")} />
      </label>
      <div className="adm-checks">
        <label><input type="checkbox" checked={form.is_featured} onChange={set("is_featured")} /> Show on home page</label>
        <label><input type="checkbox" checked={form.is_active} onChange={set("is_active")} /> Visible in shop</label>
      </div>
      {(errors.form || errors.non_field_errors) && <p className="adm-error" role="alert">{errors.form || errors.non_field_errors}</p>}
      <div className="adm-actions">
        <button className="adm-btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save product"}</button>
        <button className="adm-btn-ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, product = edit
  const [error, setError] = useState("");

  const load = () =>
    api("/admin/products/").then(setProducts).catch(() => setError("Could not load products."));

  useEffect(() => {
    load();
    api("/categories/").then(setCategories).catch(() => {});
  }, []);

  const hide = async (p) => {
    if (!window.confirm(`Hide "${p.name}" from the shop? Old orders keep their details.`)) return;
    await api(`/admin/products/${p.id}/`, { method: "DELETE" }).catch(() => setError("Could not hide the product."));
    load();
  };

  return (
    <>
      <div className="adm-head">
        <h1>Products</h1>
        {!editing && categories.length > 0 && <button className="adm-btn" onClick={() => setEditing({})}>Add product</button>}
      </div>
      {error && <p className="adm-error" role="alert">{error}</p>}

      {editing && (
        <ProductForm
          key={editing.id || "new"}
          product={editing.id ? editing : null}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {!products ? <p>Loading...</p> : (
        <div className="adm-card adm-scroll">
          <table className="adm-table">
            <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.is_active ? "" : "adm-off"}>
                  <td>{p.image_url && <img src={p.image_url} alt="" className="adm-thumb" />}</td>
                  <td>{p.name}{p.is_featured && <small className="adm-muted"> · featured</small>}</td>
                  <td>{p.category_name}</td>
                  <td>{formatPrice(p.price)}{p.mrp && <small className="adm-muted"> <s>{formatPrice(p.mrp)}</s></small>}</td>
                  <td className={p.stock < 5 ? "adm-low" : ""}>{p.stock}</td>
                  <td>{p.is_active ? "Visible" : "Hidden"}</td>
                  <td className="adm-row-actions">
                    <button className="adm-btn-sm" onClick={() => { setEditing(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                    {p.is_active && <button className="adm-btn-sm danger" onClick={() => hide(p)}>Hide</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { api, formatPrice } from "../api.js";

const BLANK_VARIANT = { color: "", size: "", price: "", mrp: "", stock: 0, image_url: "", is_active: true };
const BLANK = {
  name: "", category: "", price: "", mrp: "", image_url: "", sizes: "", colors: "", stock: 0, return_days: 7,
  description: "", is_featured: false, is_active: true,
  highlights: [], features: "", specifications: [], manufacturer_info: "", variants: [],
};

// Turns a server error (text, list or nested object) into one readable line
const messageOf = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(messageOf).find(Boolean) || "";
  return Object.values(v).map(messageOf).find(Boolean) || "";
};

function PairsEditor({ title, hint, rows, onChange, labelHint, valueHint }) {
  const update = (i, key, value) => onChange(rows.map((r, n) => (n === i ? { ...r, [key]: value } : r)));
  return (
    <fieldset className="adm-fieldset">
      <legend>{title}</legend>
      {hint && <p className="adm-muted">{hint}</p>}
      {rows.map((r, i) => (
        <div className="adm-pair" key={i}>
          <input placeholder={labelHint} value={r.label} onChange={(e) => update(i, "label", e.target.value)} aria-label={`${title} name ${i + 1}`} />
          <input placeholder={valueHint} value={r.value} onChange={(e) => update(i, "value", e.target.value)} aria-label={`${title} value ${i + 1}`} />
          <button type="button" className="adm-btn-sm danger" onClick={() => onChange(rows.filter((_, n) => n !== i))}>Remove</button>
        </div>
      ))}
      <button type="button" className="adm-btn-sm" onClick={() => onChange([...rows, { label: "", value: "" }])}>Add row</button>
    </fieldset>
  );
}

function ProductForm({ product, categories, onSaved, onCancel }) {
  const [form, setForm] = useState(
    product
      ? {
          ...BLANK, ...product, mrp: product.mrp ?? "", sizes: product.sizes.join(", "), colors: product.colors.join(", "),
          highlights: product.highlights || [], specifications: product.specifications || [],
          variants: (product.variants || []).map((v) => ({ ...v, mrp: v.mrp ?? "" })),
        }
      : { ...BLANK, category: categories[0]?.id ?? "" }
  );
  const [useVariants, setUseVariants] = useState(Boolean(product?.variants?.length));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (name) => (e) =>
    setForm({ ...form, [name]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const list = (text) => text.split(",").map((v) => v.trim()).filter(Boolean);
  const unique = (arr) => [...new Set(arr.filter(Boolean))];

  const setVariant = (i, key, value) =>
    setForm({ ...form, variants: form.variants.map((v, n) => (n === i ? { ...v, [key]: value } : v)) });

  const toggleVariants = (on) => {
    setUseVariants(on);
    if (on && form.variants.length === 0) {
      setForm({ ...form, variants: [{ ...BLANK_VARIANT, price: form.price, mrp: form.mrp, stock: form.stock }] });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});

    const rows = useVariants ? form.variants.filter((v) => v.price !== "") : [];
    if (useVariants && rows.length === 0) {
      setErrors({ form: "Add at least one colour or size row with a price." });
      return;
    }
    const live = rows.filter((v) => v.is_active);
    const cheapest = live.length ? live.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b)) : rows[0];

    const body = {
      name: form.name, category: Number(form.category), image_url: form.image_url,
      description: form.description, is_featured: form.is_featured, is_active: form.is_active,
      return_days: Number(form.return_days),
      highlights: form.highlights.filter((r) => r.label.trim() && r.value.trim()),
      specifications: form.specifications.filter((r) => r.label.trim() && r.value.trim()),
      features: form.features, manufacturer_info: form.manufacturer_info,
      // The server recalculates these from the rows when variants are used
      price: useVariants ? cheapest.price : form.price,
      mrp: useVariants ? cheapest.mrp || null : form.mrp === "" ? null : form.mrp,
      stock: useVariants ? live.reduce((n, v) => n + Number(v.stock), 0) : Number(form.stock),
      sizes: useVariants ? unique(rows.map((v) => v.size)) : list(form.sizes),
      colors: useVariants ? unique(rows.map((v) => v.color)) : list(form.colors),
      variants: rows.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        color: v.color, size: v.size, price: v.price, mrp: v.mrp === "" ? null : v.mrp,
        stock: Number(v.stock), image_url: v.image_url, is_active: v.is_active,
      })),
    };

    setSaving(true);
    try {
      await api(product ? `/admin/products/${product.id}/` : "/admin/products/", {
        method: product ? "PATCH" : "POST", body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      const d = err.data || {};
      const fe = {};
      Object.keys(d).forEach((k) => (fe[k] = messageOf(d[k])));
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
        {field("image_url", "Main image link (https://...)", { type: "url" })}
        <label className="adm-field">
          <span>Returns</span>
          <select value={form.return_days} onChange={set("return_days")}>
            <option value={0}>No returns</option>
            <option value={7}>7-day returns</option>
            <option value={15}>15-day returns</option>
            <option value={30}>30-day returns</option>
          </select>
        </label>
      </div>

      <fieldset className="adm-fieldset">
        <legend>Price and stock</legend>
        <label className="adm-check">
          <input type="checkbox" checked={useVariants} onChange={(e) => toggleVariants(e.target.checked)} />
          Different colours or sizes have different prices
        </label>

        {!useVariants ? (
          <div className="adm-form-grid">
            {field("price", "Selling price (₹)", { type: "number", min: 1, step: "0.01", required: true })}
            {field("mrp", "Original price (₹), only if on sale", { type: "number", min: 1, step: "0.01" })}
            {field("stock", "Stock", { type: "number", min: 0, required: true })}
            {field("sizes", "Sizes, separated by commas (S, M, L)")}
            {field("colors", "Colors, separated by commas (Black, Beige)")}
          </div>
        ) : (
          <>
            <p className="adm-muted">
              One row for each colour and size you sell. Leave colour or size empty if the product does not have it.
              The shop shows the lowest price as "From".
            </p>
            <div className="adm-scroll">
              <table className="adm-table adm-vtable">
                <thead>
                  <tr><th>Colour</th><th>Size</th><th>Price (₹)</th><th>Original (₹)</th><th>Stock</th><th>Photo link</th><th>On sale</th><th></th></tr>
                </thead>
                <tbody>
                  {form.variants.map((v, i) => (
                    <tr key={v.id || `new-${i}`}>
                      <td><input value={v.color} onChange={(e) => setVariant(i, "color", e.target.value)} aria-label={`Colour, row ${i + 1}`} /></td>
                      <td><input value={v.size} onChange={(e) => setVariant(i, "size", e.target.value)} aria-label={`Size, row ${i + 1}`} /></td>
                      <td><input type="number" min="1" step="0.01" value={v.price} onChange={(e) => setVariant(i, "price", e.target.value)} aria-label={`Price, row ${i + 1}`} /></td>
                      <td><input type="number" min="1" step="0.01" value={v.mrp} onChange={(e) => setVariant(i, "mrp", e.target.value)} aria-label={`Original price, row ${i + 1}`} /></td>
                      <td><input type="number" min="0" value={v.stock} onChange={(e) => setVariant(i, "stock", e.target.value)} aria-label={`Stock, row ${i + 1}`} /></td>
                      <td><input type="url" value={v.image_url} onChange={(e) => setVariant(i, "image_url", e.target.value)} aria-label={`Photo link, row ${i + 1}`} /></td>
                      <td><input type="checkbox" checked={v.is_active} onChange={(e) => setVariant(i, "is_active", e.target.checked)} aria-label={`Row ${i + 1} is on sale`} /></td>
                      <td><button type="button" className="adm-btn-sm danger" onClick={() => setForm({ ...form, variants: form.variants.filter((_, n) => n !== i) })}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="adm-btn-sm" onClick={() => setForm({ ...form, variants: [...form.variants, { ...BLANK_VARIANT }] })}>
              Add colour or size
            </button>
            {errors.variants && <p className="adm-error" role="alert">{errors.variants}</p>}
          </>
        )}
        {(errors.price || errors.mrp) && <p className="adm-error" role="alert">{errors.price || errors.mrp}</p>}
      </fieldset>

      <PairsEditor
        title="Product highlights" hint="A few short facts shown near the top, like Fabric: Cotton Blend."
        labelHint="Fabric" valueHint="Cotton Blend"
        rows={form.highlights} onChange={(rows) => setForm({ ...form, highlights: rows })}
      />

      <fieldset className="adm-fieldset">
        <legend>All details</legend>
        <label className="adm-field">
          <span>Features (one per line)</span>
          <textarea rows="4" value={form.features} onChange={set("features")} />
        </label>
        <PairsEditor
          title="Specifications" labelHint="Fit" valueHint="Regular Fit"
          rows={form.specifications} onChange={(rows) => setForm({ ...form, specifications: rows })}
        />
        <label className="adm-field">
          <span>Manufacturer info</span>
          <textarea rows="3" value={form.manufacturer_info} onChange={set("manufacturer_info")} placeholder="Name, address and country of origin" />
        </label>
      </fieldset>

      <label className="adm-field">
        <span>Description</span>
        <textarea rows="3" value={form.description} onChange={set("description")} />
      </label>
      <div className="adm-checks">
        <label><input type="checkbox" checked={form.is_featured} onChange={set("is_featured")} /> Show on home page</label>
        <label><input type="checkbox" checked={form.is_active} onChange={set("is_active")} /> Visible in shop</label>
      </div>

      {(errors.form || errors.non_field_errors || errors.name || errors.category) && (
        <p className="adm-error" role="alert">{errors.form || errors.non_field_errors || errors.name || errors.category}</p>
      )}
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
                  <td>{p.name}{p.is_featured && <small className="adm-muted"> · featured</small>}{p.variants.length > 0 && <small className="adm-muted"> · {p.variants.length} options</small>}</td>
                  <td>{p.category_name}</td>
                  <td>{p.variants.length > 0 && <small className="adm-muted">From </small>}{formatPrice(p.price)}{p.mrp && <small className="adm-muted"> <s>{formatPrice(p.mrp)}</s></small>}</td>
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

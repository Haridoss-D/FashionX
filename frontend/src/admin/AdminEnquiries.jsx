import { useEffect, useState } from "react";
import { api } from "../api.js";

const KINDS = [["", "All"], ["SELLER", "Seller applications"], ["ADVERTISE", "Advertising"], ["SUPPORT", "Customer care"]];

export default function AdminEnquiries() {
  const [kind, setKind] = useState("");
  const [done, setDone] = useState("false");
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = new URLSearchParams();
    if (kind) q.set("kind", kind);
    if (done) q.set("done", done);
    setItems(null);
    api(`/admin/enquiries/?${q}`).then(setItems).catch(() => setError("Could not load enquiries."));
  }, [kind, done]);

  const toggle = async (item) => {
    try {
      const saved = await api(`/admin/enquiries/${item.id}/`, { method: "PATCH", body: JSON.stringify({ is_done: !item.is_done }) });
      setItems((list) => list.map((x) => (x.id === item.id ? saved : x)));
    } catch {
      setError("Could not update the enquiry.");
    }
  };

  return (
    <>
      <h1>Enquiries</h1>
      <div className="adm-toolbar">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type of enquiry">
          {KINDS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select value={done} onChange={(e) => setDone(e.target.value)} aria-label="Status">
          <option value="false">To do</option>
          <option value="true">Done</option>
          <option value="">All</option>
        </select>
      </div>
      {error && <p className="adm-error" role="alert">{error}</p>}
      {!items ? <p>Loading...</p> : items.length === 0 ? <p className="adm-muted">Nothing here.</p> : (
        items.map((e) => (
          <article className="adm-card adm-enquiry" key={e.id}>
            <div className="adm-head">
              <div>
                <strong>{e.name}</strong> <span className="status status-shipped">{e.kind_label}</span>
                <p className="adm-muted">
                  {new Date(e.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              <button className="adm-btn-sm" onClick={() => toggle(e)}>{e.is_done ? "Mark as to do" : "Mark as done"}</button>
            </div>
            <p>
              <a href={`tel:${e.phone}`}>{e.phone}</a>
              {e.email && <> · <a href={`mailto:${e.email}`}>{e.email}</a></>}
              {e.business && <> · {e.business}</>}
              {e.order_number && <> · Order {e.order_number}</>}
            </p>
            <p className="adm-msg">{e.message}</p>
          </article>
        ))
      )}
    </>
  );
}

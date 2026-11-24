import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fmtDate } from "../utils.js";
import Stars from "./Stars.jsx";

export default function Reviews({ slug, onPosted }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/products/${slug}/reviews/`)
      .then((d) => {
        setData(d);
        if (d.my_review) setForm({ rating: d.my_review.rating, comment: d.my_review.comment });
      })
      .catch(() => setData({ reviews: [], can_review: false, my_review: null }));
  }, [slug, user?.id]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      setData(await api(`/products/${slug}/reviews/`, { method: "POST", body: JSON.stringify(form) }));
      setMessage("Thank you for your review.");
      onPosted?.();
    } catch (err) {
      setMessage(err.data?.detail || "Could not save your review. Please try again.");
    }
    setSaving(false);
  };

  if (!data) return <p className="muted">Loading reviews...</p>;

  return (
    <div>
      {data.reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      {data.reviews.map((r) => (
        <div className="review" key={r.id}>
          <div className="review-top">
            <strong>{r.name}</strong>
            <Stars value={r.rating} />
            <span className="muted">{fmtDate(r.created_at)}</span>
          </div>
          {r.comment && <p>{r.comment}</p>}
        </div>
      ))}

      <div className="review-form-wrap">
        {!user ? (
          <p className="muted">
            <Link to="/login" state={{ from: window.location.pathname }} className="underline">Log in</Link> to review a
            product you bought.
          </p>
        ) : !data.can_review ? (
          <p className="muted">Only customers whose order has been delivered can review this product.</p>
        ) : (
          <form onSubmit={submit} className="review-form">
            <h3>{data.my_review ? "Edit your review" : "Write a review"}</h3>
            <div className="star-pick" role="radiogroup" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button" key={n} role="radio" aria-checked={form.rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className={n <= form.rating ? "on" : ""}
                  onClick={() => setForm({ ...form, rating: n })}
                >
                  <Star size={26} fill={n <= form.rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <textarea
              rows="3" maxLength={1000} placeholder="Tell others about the fit, quality and comfort"
              value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
            <button className="btn btn-dark" type="submit" disabled={saving}>{saving ? "Saving..." : "Submit review"}</button>
            {message && <p role="status" className="muted">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

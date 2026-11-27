import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const OPTIONS = [
  { key: "notify_orders", title: "Order updates", text: "Confirmation, shipping and delivery updates for your orders." },
  { key: "notify_offers", title: "Offers and new arrivals", text: "Sales, discounts and new products. You can turn this off any time." },
];

export default function Notifications() {
  const { user, ready, updateProfile } = useAuth();
  const [message, setMessage] = useState("");

  if (!ready) return <p className="container empty">Loading...</p>;
  if (!user) return <Navigate to="/login" state={{ from: "/notifications" }} replace />;

  const change = async (key, value) => {
    setMessage("");
    try {
      await updateProfile({ [key]: value });
      setMessage("Saved.");
    } catch {
      setMessage("Could not save. Please try again.");
    }
  };

  return (
    <div className="container info-page">
      <h1>Notification Settings</h1>
      <p className="muted">Choose what you would like to hear about. Your choices are saved to your account.</p>
      <div className="panel">
        {OPTIONS.map((o) => (
          <label className="toggle-row" key={o.key}>
            <span>
              <strong>{o.title}</strong>
              <small className="muted">{o.text}</small>
            </span>
            <input type="checkbox" checked={Boolean(user[o.key])} onChange={(e) => change(o.key, e.target.checked)} />
          </label>
        ))}
        {message && <p role="status" className={message === "Saved." ? "ok" : "error"}>{message}</p>}
      </div>
    </div>
  );
}

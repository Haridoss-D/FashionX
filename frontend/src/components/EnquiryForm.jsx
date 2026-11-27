import { useState } from "react";
import { api, firstError } from "../api.js";

// fields: [{ name, label, type?, required?, textarea?, placeholder? }]
export default function EnquiryForm({ kind, fields, submitLabel, successText }) {
  const start = Object.fromEntries(fields.map((f) => [f.name, ""]));
  const [form, setForm] = useState({ ...start, website: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setFormError("");
    setSaving(true);
    try {
      await api("/enquiries/", { method: "POST", body: JSON.stringify({ kind, ...form }) });
      setSent(true);
    } catch (err) {
      const d = err.data || {};
      const fieldErrors = {};
      fields.forEach((f) => d[f.name] && (fieldErrors[f.name] = firstError(d[f.name])));
      setErrors(fieldErrors);
      setFormError(d.detail || (Object.keys(fieldErrors).length ? "" : "Something went wrong. Please try again."));
    }
    setSaving(false);
  };

  if (sent) {
    return (
      <div className="panel" role="status">
        <h2>Thank you</h2>
        <p>{successText}</p>
      </div>
    );
  }

  return (
    <form className="panel enquiry" onSubmit={submit}>
      {fields.map((f) => (
        <label className="field" key={f.name}>
          <span>{f.label}{f.required ? "" : " (optional)"}</span>
          {f.textarea ? (
            <textarea
              rows="4" maxLength={2000} required={f.required} placeholder={f.placeholder}
              value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              aria-invalid={Boolean(errors[f.name])}
            />
          ) : (
            <input
              type={f.type || "text"} required={f.required} placeholder={f.placeholder}
              value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              aria-invalid={Boolean(errors[f.name])}
            />
          )}
          {errors[f.name] && <em className="field-error">{errors[f.name]}</em>}
        </label>
      ))}
      {/* Hidden trap: people never see this, spam bots fill it in */}
      <input
        className="trap" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website"
        value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
      />
      {formError && <p className="error" role="alert">{formError}</p>}
      <button className="btn btn-dark" type="submit" disabled={saving}>{saving ? "Sending..." : submitLabel}</button>
    </form>
  );
}

import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { firstError } from "../api.js";

export default function Auth({ mode }) {
  const isRegister = mode === "register";
  const { user, login, register } = useAuth();
  const location = useLocation();
  const from = location.state?.from || "/account";

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setFormError("");
    setSaving(true);
    try {
      if (isRegister) await register(form);
      else await login(form.email, form.password);
    } catch (err) {
      const d = err.data || {};
      const fieldErrors = {};
      ["full_name", "email", "phone", "password"].forEach((k) => d[k] && (fieldErrors[k] = firstError(d[k])));
      setErrors(fieldErrors);
      setFormError(
        d.detail || (Object.keys(fieldErrors).length ? "" : "Something went wrong. Please try again.")
      );
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <label className="field">
      <span>{label}</span>
      <input value={form[name]} onChange={set(name)} required aria-invalid={Boolean(errors[name])} {...props} />
      {errors[name] && <em className="field-error">{errors[name]}</em>}
    </label>
  );

  return (
    <div className="container auth-wrap">
      <form className="panel auth-card" onSubmit={submit}>
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">
          {isRegister ? "Track your orders and check out faster." : "Log in to see your profile and orders."}
        </p>

        {isRegister && field("full_name", "Full name", { autoComplete: "name" })}
        {field("email", "Email", { type: "email", autoComplete: "email" })}
        {isRegister && field("phone", "Mobile number", { type: "tel", inputMode: "numeric", placeholder: "10-digit number", autoComplete: "tel" })}
        {field("password", "Password", {
          type: "password",
          minLength: isRegister ? 8 : undefined,
          autoComplete: isRegister ? "new-password" : "current-password",
        })}
        {isRegister && <p className="muted">At least 8 characters. Avoid common passwords.</p>}

        {formError && <p className="error" role="alert">{formError}</p>}
        <button className="btn btn-dark btn-block" type="submit" disabled={saving}>
          {saving ? "Please wait..." : isRegister ? "Create account" : "Log in"}
        </button>

        <p className="auth-switch">
          {isRegister ? (
            <>Already have an account? <Link to="/login" state={location.state}>Log in</Link></>
          ) : (
            <>New to FashionX? <Link to="/register" state={location.state}>Create an account</Link></>
          )}
        </p>
      </form>
    </div>
  );
}

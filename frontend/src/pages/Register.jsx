import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CircleDollarSign,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getApiError } from "../services/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (new TextEncoder().encode(form.password).length > 72) {
      setError("Your password must not exceed 72 UTF-8 bytes.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link to="/register" className="brand auth-brand">
          <span className="brand-mark">
            <CircleDollarSign size={25} />
          </span>
          <span className="brand-name">
            smart<span>spend</span>
            <small>PERSONAL FINANCE</small>
          </span>
        </Link>

        <div className="auth-promo">
          <span className="eyebrow">
            <span className="live-dot" />
            A BETTER RELATIONSHIP WITH MONEY
          </span>
          <h1>Your financial journey starts here.</h1>
          <p>
            Create your account and bring your transactions, budgets, and
            financial insights together.
          </p>

          <div className="auth-feature">
            <span>01</span>
            <div>
              <strong>Everything in one place</strong>
              <p>Keep your income and expenses organized.</p>
            </div>
          </div>

          <div className="auth-feature">
            <span>02</span>
            <div>
              <strong>Progress you can understand</strong>
              <p>Make informed decisions with your own financial data.</p>
            </div>
          </div>
        </div>

        <p className="auth-panel-footer">
          Start simple. Build better habits.
        </p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <span className="brand-mark">
              <CircleDollarSign size={23} />
            </span>
            <span className="brand-name">
              smart<span>spend</span>
            </span>
          </div>

          <span className="eyebrow">GET STARTED</span>
          <h2>Create your account</h2>
          <p className="auth-description">
            Set up your account to start managing your finances.
          </p>

          {error && (
            <div className="form-alert" role="alert">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="name">Full name</label>
            <div className="input-with-icon">
              <UserRound size={18} aria-hidden="true" />
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                maxLength={80}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </div>

            <label htmlFor="email">Email address</label>
            <div className="input-with-icon">
              <Mail size={18} aria-hidden="true" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                required
              />
            </div>

            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label htmlFor="confirmPassword">Confirm password</label>
            <div className="input-with-icon">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Enter your password again"
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm({ ...form, confirmPassword: event.target.value })
                }
                required
              />
            </div>

            <button
              className="primary-btn auth-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Create account"}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

          <p className="auth-security">
            <LockKeyhole size={14} />
            Your password is handled by the secure backend.
          </p>
        </div>
      </section>
    </main>
  );
}

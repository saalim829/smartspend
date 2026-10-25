import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CircleDollarSign,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getApiError } from "../services/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || "/dashboard";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);

    try {
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      navigate(destination, { replace: true });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link to="/login" className="brand auth-brand">
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
            YOUR MONEY, MORE INTENTIONALLY
          </span>
          <h1>Make every rupee count.</h1>
          <p>
            Understand your spending, plan your budgets, and build healthier
            financial habits with SmartSpend.
          </p>

          <div className="auth-feature">
            <span>01</span>
            <div>
              <strong>Know where your money goes</strong>
              <p>See your income and expenses in one place.</p>
            </div>
          </div>

          <div className="auth-feature">
            <span>02</span>
            <div>
              <strong>Build better money habits</strong>
              <p>Track budgets and stay aware of your spending.</p>
            </div>
          </div>
        </div>

        <p className="auth-panel-footer">
          Spend mindfully. Live confidently.
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

          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your account</h2>
          <p className="auth-description">
            Enter your details to continue to your dashboard.
          </p>

          {error && (
            <div className="form-alert" role="alert">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
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
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
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

            <button
              className="primary-btn auth-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create account</Link>
          </p>

          <p className="auth-security">
            <LockKeyhole size={14} />
            Your account is protected by secure authentication.
          </p>
        </div>
      </section>
    </main>
  );
}

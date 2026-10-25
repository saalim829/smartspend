import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  RefreshCw,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api, { getApiError } from "../services/api";

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

export default function Reports() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dashboard");
      const payload =
        response.data?.data ??
        response.data?.dashboard ??
        response.data;

      if (!payload?.overview) {
        throw new Error("The report data format is different from expected.");
      }

      setDashboard(payload);
    } catch (err) {
      setError(
        err.message?.includes("format is different")
          ? err.message
          : getApiError(err)
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <p className="eyebrow">YOUR FINANCIAL PICTURE</p>
            <h1>Reports & Insights</h1>
          </div>
        </div>
        <div className="panel empty-state">
          <RefreshCw size={25} className="loading-icon" />
          <p>Loading your financial reports...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <p className="eyebrow">YOUR FINANCIAL PICTURE</p>
            <h1>Reports & Insights</h1>
          </div>
          <button className="btn btn-primary" onClick={loadReports}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
        <div className="alert alert-error" role="alert">{error}</div>
      </section>
    );
  }

  const overview = dashboard.overview;
  const comparison = dashboard.monthlyComparison || [];
  const categories = dashboard.expensesByCategory || [];

  return (
    <section className="page-section reports-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR FINANCIAL PICTURE</p>
          <h1>Reports & Insights</h1>
          <p>Understand your income, expenses, and spending patterns.</p>
        </div>
        <button className="btn btn-secondary" onClick={loadReports}>
          <RefreshCw size={16} /> Refresh report
        </button>
      </div>

      <div className="stats-grid report-summary-grid">
        <article className="stat-card">
          <div className="stat-top">
            <span>Total income</span>
            <span className="stat-icon success"><ArrowUpRight size={19} /></span>
          </div>
          <strong className="stat-value">
            {currency(overview.totalIncome)}
          </strong>
          <span className="stat-footnote">Recorded income</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>Total expenses</span>
            <span className="stat-icon danger"><ArrowDownRight size={19} /></span>
          </div>
          <strong className="stat-value">
            {currency(overview.totalExpenses)}
          </strong>
          <span className="stat-footnote">Recorded expenses</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>Current balance</span>
            <span className="stat-icon primary"><Wallet size={19} /></span>
          </div>
          <strong className="stat-value">{currency(overview.balance)}</strong>
          <span className="stat-footnote">Income minus expenses</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>Savings rate</span>
            <span className="stat-icon primary">
              <ChartNoAxesCombined size={19} />
            </span>
          </div>
          <strong className="stat-value">
            {(Number(overview.savingsRate) || 0).toFixed(1)}%
          </strong>
          <span className="stat-footnote">Based on recorded finances</span>
        </article>
      </div>

      <section className="panel report-chart-panel">
        <div className="panel-heading">
          <div>
            <h2>Monthly income vs expenses</h2>
            <p>Compare your recorded income and spending over time.</p>
          </div>
        </div>

        {comparison.length ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={comparison}
                margin={{ top: 12, right: 12, left: 12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(value) =>
                    value >= 1000 ? `₹${value / 1000}k` : `₹${value}`
                  }
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(value) => currency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#219b78"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#d95e62"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state">
            <ChartNoAxesCombined size={32} />
            <h3>Not enough data yet</h3>
            <p>Add transactions to see your monthly financial trends.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Expense breakdown</h2>
            <p>See how your recorded expenses are distributed by category.</p>
          </div>
        </div>

        {categories.length ? (
          <div className="category-list">
            {categories.map((item) => (
              <div className="category-row" key={item.category}>
                <div className="category-row-top">
                  <span>{item.category}</span>
                  <strong>{currency(item.amount)}</strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, Number(item.percentage) || 0)
                      )}%`,
                    }}
                  />
                </div>
                <span className="category-percentage">
                  {(Number(item.percentage) || 0).toFixed(1)}% of expenses
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No expense categories to report yet.</p>
          </div>
        )}
      </section>
    </section>
  );
}
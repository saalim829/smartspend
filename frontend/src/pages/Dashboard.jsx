import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Plus,
  RefreshCw,
  TrendingUp,
  Wallet,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api, { getApiError } from "../services/api";

const CHART_COLORS = [
  "#5965dc",
  "#38a88a",
  "#f1a45b",
  "#e16b78",
  "#8b75d7",
  "#55a6cb",
  "#d6bd58",
  "#8994aa",
];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  const amount = Number(value);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(value) {
  return String(value || "Transaction")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>

        <span className={`stat-icon ${tone}`}>
          <Icon size={20} />
        </span>
      </div>

      <div className="stat-value">{value}</div>

      <div className="stat-description">{description}</div>
    </article>
  );
}

function PanelHeading({ title, description, link, to }) {
  return (
    <div className="panel-header">
      <div>
        <h2 className="panel-title">{title}</h2>
        {description && <p className="panel-description">{description}</p>}
      </div>

      {link && to && (
        <Link to={to} className="panel-link">
          {link} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ title, description, action, to }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <WalletCards size={25} />
      </div>

      <h3>{title}</h3>
      <p>{description}</p>

      {action && to && (
        <Link to={to} className="btn btn-primary">
          <Plus size={16} />
          {action}
        </Link>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>

      {payload.map((entry) => (
        <div className="chart-tooltip-value" key={entry.dataKey}>
          <span style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ExpenseBreakdown({ categories }) {
  const validCategories = categories.filter(
    (category) => Number(category.amount) > 0
  );

  if (!validCategories.length) {
    return (
      <EmptyState
        title="No expenses to analyse"
        description="Once you record expenses, your spending breakdown will appear here."
        action="Add expense"
        to="/transactions"
      />
    );
  }

  return (
    <>
      <div className="chart-container" role="img" aria-label="Expenses by category">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={validCategories}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius="56%"
              outerRadius="82%"
              paddingAngle={3}
              stroke="none"
            >
              {validCategories.map((item, index) => (
                <Cell
                  key={`${item.category}-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) => formatCurrency(value)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="category-list">
        {validCategories.slice(0, 6).map((item, index) => (
          <div className="category-row" key={`${item.category}-${index}`}>
            <div className="category-row-top">
              <div className="category-label">
                <span
                  className="legend-dot"
                  style={{
                    backgroundColor:
                      CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
                <span>{item.category || "Other"}</span>
              </div>

              <span className="category-amount">
                {formatCurrency(item.amount)}
              </span>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label={`${item.category} share of expenses`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(
                100,
                Math.max(0, Number(item.percentage) || 0)
              )}
            >
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, Number(item.percentage) || 0)
                  )}%`,
                  backgroundColor:
                    CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RecentTransactions({ transactions }) {
  if (!transactions.length) {
    return (
      <EmptyState
        title="Your journey starts here"
        description="You haven't recorded any transactions yet. Add your first income or expense to start tracking your finances."
        action="Add transaction"
        to="/transactions"
      />
    );
  }

  return (
    <div className="transaction-list">
      {transactions.slice(0, 6).map((transaction, index) => {
        const isIncome = transaction.type === "income";

        return (
          <div
            className="transaction-row"
            key={transaction._id || transaction.id || `${transaction.description}-${index}`}
          >
            <div className={`transaction-icon ${transaction.type}`}>
              {isIncome ? (
                <ArrowDownRight size={19} />
              ) : (
                <ArrowUpRight size={19} />
              )}
            </div>

            <div className="transaction-info">
              <p className="transaction-title">
                {transaction.description || "Untitled transaction"}
              </p>

              <p className="transaction-meta">
                {transaction.category || "Uncategorised"} ·{" "}
                {formatDate(transaction.date)}
              </p>
            </div>

            <div
              className={`transaction-amount ${
                isIncome ? "income" : "expense"
              }`}
            >
              {isIncome ? "+" : "−"}
              {formatCurrency(transaction.amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BudgetOverview({ budgets }) {
  if (!budgets.length) {
    return (
      <EmptyState
        title="No budgets created"
        description="Set category limits to understand how your spending compares with your financial goals."
        action="Create a budget"
        to="/budgets"
      />
    );
  }

  return (
    <div className="category-list">
      {budgets.slice(0, 5).map((budget, index) => {
        const percentage = Math.max(
          0,
          Number(budget.percentageUsed) || 0
        );

        const exceeded = Boolean(budget.overspent) || percentage >= 100;

        const tone = exceeded
          ? "red"
          : percentage >= 80
            ? "orange"
            : "green";

        const remaining = Number(budget.remaining) || 0;

        return (
          <div
            className="category-row"
            key={budget.id || budget._id || `${budget.category}-${index}`}
          >
            <div className="category-row-top">
              <div className="category-label">
                <span>{budget.category || "Other"}</span>
              </div>

              <span className="category-amount">
                {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
              </span>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label={`${budget.category} budget used`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, percentage)}
            >
              <div
                className={`progress-fill ${tone}`}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>

            <div className="budget-footer">
              <span>
                {exceeded
                  ? "Budget exceeded"
                  : `${formatCurrency(remaining)} remaining`}
              </span>

              <span>{Math.round(percentage)}% used</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/dashboard");

      // Support the common API response shapes without fabricating data.
      const payload =
        response.data?.data ??
        response.data?.dashboard ??
        response.data;

      if (!payload || !payload.overview) {
        throw new Error(
          "The dashboard response is missing its overview data. Check the backend response format."
        );
      }

      setDashboard(payload);
    } catch (requestError) {
      setError(
        requestError.response
          ? getApiError(requestError)
          : requestError.message || getApiError(requestError)
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="loading-state" role="status">
        <span className="loading-spinner" />
        <p>Loading your financial overview...</p>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <section>
        <div className="page-header">
          <div>
            <h1 className="page-heading">Your overview</h1>
            <p className="page-subtitle">
              A clear picture of your personal finances.
            </p>
          </div>
        </div>

        <div className="alert alert-error" role="alert">
          <CircleDollarSign size={18} />
          <div>
            <strong>Couldn't load your dashboard.</strong>
            <br />
            {error}
          </div>
        </div>

        <button
          className="btn btn-primary"
          type="button"
          onClick={() => fetchDashboard()}
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </section>
    );
  }

  const overview = dashboard?.overview || {};

  const expensesByCategory = Array.isArray(dashboard?.expensesByCategory)
    ? dashboard.expensesByCategory
    : [];

  const monthlyComparison = Array.isArray(dashboard?.monthlyComparison)
    ? dashboard.monthlyComparison
    : [];

  const recentTransactions = Array.isArray(dashboard?.recentTransactions)
    ? dashboard.recentTransactions
    : [];

  const budgets = Array.isArray(dashboard?.budgets)
    ? dashboard.budgets
    : [];

  const savingsRate = Number(overview.savingsRate) || 0;

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1 className="page-heading">Your overview</h1>
          <p className="page-subtitle">
            Here's how your money is working for you.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "loading-icon" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <Link to="/transactions" className="btn btn-primary">
            <Plus size={17} />
            Add transaction
          </Link>
        </div>
      </header>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <section className="stats-grid" aria-label="Financial summary">
        <StatCard
          label="Total income"
          value={formatCurrency(overview.totalIncome)}
          description={
            <>
              <ArrowDownRight size={14} className="positive-text" />
              {Number(overview.incomeTransactionCount) || 0} income transactions
            </>
          }
          icon={TrendingUp}
          tone="green"
        />

        <StatCard
          label="Total expenses"
          value={formatCurrency(overview.totalExpenses)}
          description={
            <>
              <ArrowUpRight size={14} className="negative-text" />
              {Number(overview.expenseTransactionCount) || 0} expense transactions
            </>
          }
          icon={ArrowUpRight}
          tone="red"
        />

        <StatCard
          label="Available balance"
          value={formatCurrency(overview.balance)}
          description={
            <>
              <Wallet size={14} />
              Income minus expenses
            </>
          }
          icon={Wallet}
          tone="purple"
        />

        <StatCard
          label="Savings rate"
          value={`${savingsRate.toFixed(1)}%`}
          description={
            <>
              <CalendarDays size={14} />
              Based on your recorded finances
            </>
          }
          icon={CircleDollarSign}
          tone="orange"
        />
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-column">
          <article className="panel">
            <PanelHeading
              title="Income vs. expenses"
              description="Your monthly financial activity"
            />

            {monthlyComparison.length ? (
              <>
                <div
                  className="chart-container chart-container-wide"
                  role="img"
                  aria-label="Monthly income and expense comparison chart"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyComparison}
                      margin={{
                        top: 8,
                        right: 5,
                        left: 5,
                        bottom: 0,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="incomeGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#38a88a"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="100%"
                            stopColor="#38a88a"
                            stopOpacity={0}
                          />
                        </linearGradient>

                        <linearGradient
                          id="expenseGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#5965dc"
                            stopOpacity={0.17}
                          />
                          <stop
                            offset="100%"
                            stopColor="#5965dc"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        stroke="#eff0f6"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#8a8fa2", fontSize: 10 }}
                        dy={9}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={65}
                        tick={{ fill: "#8a8fa2", fontSize: 10 }}
                        tickFormatter={(value) =>
                          value >= 100000
                            ? `₹${(value / 100000).toFixed(1)}L`
                            : value >= 1000
                              ? `₹${(value / 1000).toFixed(0)}k`
                              : `₹${value}`
                        }
                      />

                      <Tooltip content={<CustomTooltip />} />

                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        iconSize={7}
                        wrapperStyle={{
                          fontSize: "11px",
                          paddingBottom: "15px",
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#38a88a"
                        strokeWidth={2.5}
                        fill="url(#incomeGradient)"
                        activeDot={{ r: 4 }}
                      />

                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#5965dc"
                        strokeWidth={2.5}
                        fill="url(#expenseGradient)"
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-legend">
                  <span className="legend-item">
                    <span
                      className="legend-dot"
                      style={{ background: "#38a88a" }}
                    />
                    Income
                  </span>

                  <span className="legend-item">
                    <span
                      className="legend-dot"
                      style={{ background: "#5965dc" }}
                    />
                    Expenses
                  </span>
                </div>
              </>
            ) : (
              <EmptyState
                title="Your monthly trend will appear here"
                description="Record income or expenses to start building your financial history."
                action="Add transaction"
                to="/transactions"
              />
            )}
          </article>

          <article className="panel">
            <PanelHeading
              title="Recent transactions"
              description="Your latest recorded financial activity"
              link="View all"
              to="/transactions"
            />

            <RecentTransactions transactions={recentTransactions} />
          </article>
        </div>

        <div className="dashboard-column">
          <article className="panel">
            <PanelHeading
              title="Spending breakdown"
              description="Where your money is going"
              link="Transactions"
              to="/transactions"
            />

            <ExpenseBreakdown categories={expensesByCategory} />
          </article>

          <article className="panel">
            <PanelHeading
              title="Budget overview"
              description="Track spending against your limits"
              link="Manage"
              to="/budgets"
            />

            <BudgetOverview budgets={budgets} />
          </article>
        </div>
      </section>

      <section className="panel">
        <PanelHeading
          title="Financial snapshot"
          description="A quick summary of your recorded activity"
        />

        <div className="report-summary-grid">
          <div className="report-card">
            <div className="report-card-label">Recorded transactions</div>
            <div className="report-card-value">
              {Number(overview.transactionCount) || 0}
            </div>
          </div>

          <div className="report-card">
            <div className="report-card-label">Budget categories</div>
            <div className="report-card-value">{budgets.length}</div>
          </div>

          <div className="report-card">
            <div className="report-card-label">Expense categories</div>
            <div className="report-card-value">
              {
                expensesByCategory.filter(
                  (category) => Number(category.amount) > 0
                ).length
              }
            </div>
          </div>
        </div>

        <Link to="/reports" className="panel-link">
          Explore financial reports <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}
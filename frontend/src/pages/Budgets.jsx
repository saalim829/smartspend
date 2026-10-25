import { useCallback, useEffect, useState } from "react";
import {
  WalletCards,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  CalendarDays,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import api from "../services/api";

const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Shopping",
  "Entertainment",
  "Health",
  "Education",
  "Bills",
  "Travel",
  "Personal Care",
  "Other",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentDate = new Date();

const emptyForm = {
  category: "Food",
  limit: "",
  month: currentDate.getMonth() + 1,
  year: currentDate.getFullYear(),
};

function formatCurrency(value = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getProgressColor(percentage, overspent) {
  if (overspent || percentage > 100) return "danger";
  if (percentage >= 80) return "warning";
  return "success";
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}) {
  return (
    <article className="budget-summary-card">
      <div className="budget-summary-top">
        <span className="budget-summary-label">{title}</span>
        <span className={`budget-summary-icon ${tone}`}>
          <Icon size={21} strokeWidth={2} />
        </span>
      </div>

      <div className="budget-summary-value">{formatCurrency(value)}</div>

      <p className="budget-summary-description">{description}</p>
    </article>
  );
}

function BudgetModal({
  initialBudget,
  selectedMonth,
  selectedYear,
  onClose,
  onSave,
  saving,
}) {
  const isEditing = Boolean(initialBudget?._id);

  const [form, setForm] = useState(() => ({
    category: initialBudget?.category || "Food",
    limit: initialBudget?.limit ?? "",
    month: initialBudget?.month ?? selectedMonth,
    year: initialBudget?.year ?? selectedYear,
  }));

  const [formError, setFormError] = useState("");

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const limit = Number(form.limit);
    const month = Number(form.month);
    const year = Number(form.year);

    if (!Number.isFinite(limit) || limit <= 0) {
      setFormError("Enter a budget limit greater than zero.");
      return;
    }

    if (limit > 1_000_000_000_000) {
      setFormError("The budget limit exceeds the maximum allowed amount.");
      return;
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      setFormError("Choose a valid month.");
      return;
    }

    if (!Number.isInteger(year) || year < 2000 || year > 9999) {
      setFormError("Enter a valid year.");
      return;
    }

    setFormError("");

    try {
      await onSave({
        category: form.category,
        limit,
        month,
        year,
      });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  return (
    <div
      className="budget-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section
        className="budget-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
      >
        <header className="budget-modal-header">
          <div>
            <span className="budget-modal-eyebrow">
              {isEditing ? "UPDATE YOUR PLAN" : "PLAN YOUR SPENDING"}
            </span>

            <h2 id="budget-modal-title">
              {isEditing ? "Edit budget" : "Create a budget"}
            </h2>

            <p>
              {isEditing
                ? "Update your spending limit for this category."
                : "Set a monthly spending limit and stay in control."}
            </p>
          </div>

          <button
            type="button"
            className="budget-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="budget-form">
          <div className="budget-form-field">
            <label htmlFor="budget-category">Spending category</label>

            <select
              id="budget-category"
              name="category"
              value={form.category}
              onChange={updateField}
              required
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="budget-form-field">
            <label htmlFor="budget-limit">Monthly budget limit</label>

            <div className="budget-money-input">
              <span aria-hidden="true">₹</span>

              <input
                id="budget-limit"
                name="limit"
                type="number"
                min="0.01"
                max="1000000000000"
                step="0.01"
                placeholder="e.g. 5000"
                value={form.limit}
                onChange={updateField}
                required
              />
            </div>

            <small>Set the maximum amount you plan to spend.</small>
          </div>

          <div className="budget-form-row">
            <div className="budget-form-field">
              <label htmlFor="budget-month">Month</label>

              <select
                id="budget-month"
                name="month"
                value={form.month}
                onChange={updateField}
                required
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div className="budget-form-field">
              <label htmlFor="budget-year">Year</label>

              <input
                id="budget-year"
                name="year"
                type="number"
                min="2000"
                max="9999"
                value={form.year}
                onChange={updateField}
                required
              />
            </div>
          </div>

          {formError && (
            <div className="budget-form-error" role="alert">
              <AlertTriangle size={17} />
              <span>{formError}</span>
            </div>
          )}

          <div className="budget-modal-actions">
            <button
              type="button"
              className="budget-btn budget-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="budget-btn budget-btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw size={17} className="budget-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  {isEditing ? "Save changes" : "Create budget"}
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BudgetCard({ budget, onEdit, onDelete }) {
  const percentage = Math.max(0, Number(budget.percentageUsed) || 0);
  const progressColor = getProgressColor(percentage, budget.overspent);

  const remaining = Number(budget.remaining) || 0;
  const spent = Number(budget.spent) || 0;
  const limit = Number(budget.limit) || 0;

  return (
    <article className="budget-item-card">
      <header className="budget-item-header">
        <div className="budget-item-category">
          <span className={`budget-category-icon ${progressColor}`}>
            <WalletCards size={21} />
          </span>

          <div>
            <h3>{budget.category}</h3>
            <p>
              {budget.transactionCount ?? 0}{" "}
              {(budget.transactionCount ?? 0) === 1
                ? "transaction"
                : "transactions"}
            </p>
          </div>
        </div>

        <div className="budget-item-actions">
          <button
            type="button"
            className="budget-icon-button"
            onClick={() => onEdit(budget)}
            aria-label={`Edit ${budget.category} budget`}
            title="Edit budget"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            className="budget-icon-button budget-delete-button"
            onClick={() => onDelete(budget)}
            aria-label={`Delete ${budget.category} budget`}
            title="Delete budget"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      <div className="budget-item-amounts">
        <div>
          <span className="budget-muted-label">Spent so far</span>
          <strong>{formatCurrency(spent)}</strong>
        </div>

        <div className="budget-limit-amount">
          <span className="budget-muted-label">Monthly limit</span>
          <strong>{formatCurrency(limit)}</strong>
        </div>
      </div>

      <div
        className="budget-progress-track"
        role="progressbar"
        aria-label={`${budget.category} budget usage`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percentage, 100)}
      >
        <div
          className={`budget-progress-fill ${progressColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="budget-progress-caption">
        <span className={`budget-usage-label ${progressColor}`}>
          {percentage.toFixed(1)}% used
        </span>

        <span>
          {percentage > 100
            ? `${(percentage - 100).toFixed(1)}% over limit`
            : `${Math.max(0, 100 - percentage).toFixed(1)}% remaining`}
        </span>
      </div>

      <footer
        className={`budget-remaining-box ${
          budget.overspent ? "is-overspent" : ""
        }`}
      >
        <span>
          {budget.overspent ? (
            <AlertTriangle size={17} />
          ) : (
            <PiggyBank size={17} />
          )}

          {budget.overspent ? "Amount over budget" : "Available to spend"}
        </span>

        <strong>{formatCurrency(Math.abs(remaining))}</strong>
      </footer>
    </article>
  );
}

export default function Budgets() {
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState({
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    budgetCount: 0,
    overspentCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadBudgets = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setPageError("");

      try {
        const response = await api.get("/budgets", {
          params: { month, year },
        });

        const data = response.data;

        setBudgets(Array.isArray(data.budgets) ? data.budgets : []);

        setSummary({
          totalBudget: Number(data.summary?.totalBudget) || 0,
          totalSpent: Number(data.summary?.totalSpent) || 0,
          totalRemaining: Number(data.summary?.totalRemaining) || 0,
          budgetCount: Number(data.summary?.budgetCount) || 0,
          overspentCount: Number(data.summary?.overspentCount) || 0,
        });
      } catch (error) {
        setPageError(getErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month, year]
  );

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = window.setTimeout(() => setNotice(""), 3500);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  function openCreateModal() {
    setEditingBudget(null);
    setShowModal(true);
  }

  function openEditModal(budget) {
    setEditingBudget(budget);
    setShowModal(true);
  }

  async function saveBudget(formData) {
    setSaving(true);

    try {
      if (editingBudget?._id) {
        await api.patch(`/budgets/${editingBudget._id}`, formData);
        setNotice("Budget updated successfully.");
      } else {
        await api.post("/budgets", formData);
        setNotice("Budget created successfully.");
      }

      setShowModal(false);
      setEditingBudget(null);

      // Show the period that was saved.
      setMonth(formData.month);
      setYear(formData.year);

      // Fetch the latest data for the selected period.
      if (formData.month === month && formData.year === year) {
        await loadBudgets({ silent: true });
      }
    } catch (error) {
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget(budget) {
    const confirmed = window.confirm(
      `Delete the ${budget.category} budget for ${
        MONTHS[(budget.month || month) - 1]
      } ${budget.year || year}?\n\nThis will delete the budget plan, not your transactions.`
    );

    if (!confirmed) return;

    setPageError("");

    try {
      await api.delete(`/budgets/${budget._id}`);
      setNotice(`${budget.category} budget deleted.`);
      await loadBudgets({ silent: true });
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  const spentPercentage =
    summary.totalBudget > 0
      ? (summary.totalSpent / summary.totalBudget) * 100
      : 0;

  return (
    <div className="budget-page">
      {notice && (
        <div className="budget-toast" role="status">
          <CheckCircle2 size={19} />
          {notice}
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <header className="budget-page-header">
        <div className="budget-page-heading">
          <span className="budget-eyebrow">PLAN WITH PURPOSE</span>
          <h1>Budgets</h1>
          <p>
            Set spending limits, track your progress, and make every rupee
            count.
          </p>
        </div>

        <div className="budget-header-actions">
          <button
            type="button"
            className="budget-btn budget-btn-secondary"
            onClick={() => loadBudgets({ silent: true })}
            disabled={refreshing || loading}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "budget-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            className="budget-btn budget-btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={19} />
            Create budget
          </button>
        </div>
      </header>

      <section className="budget-period-bar">
        <div className="budget-period-title">
          <CalendarDays size={19} />
          <div>
            <strong>Budget period</strong>
            <span>Review your monthly spending plan</span>
          </div>
        </div>

        <div className="budget-period-controls">
          <select
            aria-label="Budget month"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {MONTHS.map((item, index) => (
              <option key={item} value={index + 1}>
                {item}
              </option>
            ))}
          </select>

          <select
            aria-label="Budget year"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {Array.from({ length: 7 }, (_, index) => {
              const optionYear = currentDate.getFullYear() - 3 + index;

              return (
                <option key={optionYear} value={optionYear}>
                  {optionYear}
                </option>
              );
            })}

            {year < currentDate.getFullYear() - 3 ||
            year > currentDate.getFullYear() + 3 ? (
              <option value={year}>{year}</option>
            ) : null}
          </select>
        </div>
      </section>

      {pageError && (
        <div className="budget-page-error" role="alert">
          <AlertTriangle size={19} />
          <span>{pageError}</span>

          <button
            type="button"
            onClick={() => loadBudgets()}
            className="budget-error-retry"
          >
            Try again
          </button>
        </div>
      )}

      <section className="budget-summary-grid">
        <SummaryCard
          title="Total budget"
          value={summary.totalBudget}
          description={`${summary.budgetCount} budget ${
            summary.budgetCount === 1 ? "category" : "categories"
          }`}
          icon={WalletCards}
          tone="purple"
        />

        <SummaryCard
          title="Total spent"
          value={summary.totalSpent}
          description={
            summary.totalBudget > 0
              ? `${spentPercentage.toFixed(1)}% of your total budget`
              : "No budget allocated yet"
          }
          icon={TrendingDown}
          tone="orange"
        />

        <SummaryCard
          title="Remaining amount"
          value={summary.totalRemaining}
          description={
            summary.totalRemaining < 0
              ? "You have exceeded your total budget"
              : "Available across all budget categories"
          }
          icon={CircleDollarSign}
          tone={summary.totalRemaining < 0 ? "red" : "green"}
        />

        <SummaryCard
          title="Over-budget categories"
          value={summary.overspentCount}
          description={
            summary.overspentCount === 0
              ? "All budgets are within their limits"
              : "Categories that exceeded their limits"
          }
          icon={AlertTriangle}
          tone={summary.overspentCount > 0 ? "red" : "green"}
        />
      </section>

      <section className="budget-overview-panel">
        <div className="budget-overview-copy">
          <span className="budget-overview-icon">
            <PiggyBank size={23} />
          </span>

          <div>
            <h2>Your spending overview</h2>
            <p>
              {summary.totalBudget > 0
                ? `You've used ${spentPercentage.toFixed(
                    1
                  )}% of your allocated budget this month.`
                : "Create your first budget to start tracking your spending."}
            </p>
          </div>
        </div>

        <div className="budget-overview-amount">
          <span>Total allocation</span>
          <strong>{formatCurrency(summary.totalBudget)}</strong>
        </div>

        <div className="budget-overview-track">
          <div
            className={`budget-overview-fill ${
              spentPercentage > 100 ? "danger" : ""
            }`}
            style={{ width: `${Math.min(spentPercentage, 100)}%` }}
          />
        </div>

        <div className="budget-overview-footer">
          <span>
            <span className="budget-legend-dot spent" />
            Spent: {formatCurrency(summary.totalSpent)}
          </span>

          <span>
            <span className="budget-legend-dot remaining" />
            Remaining: {formatCurrency(summary.totalRemaining)}
          </span>
        </div>
      </section>

      <section className="budget-list-section">
        <header className="budget-list-header">
          <div>
            <h2>Your budgets</h2>
            <p>
              {MONTHS[month - 1]} {year} · Track each spending category
            </p>
          </div>

          <span className="budget-count-badge">
            {budgets.length} {budgets.length === 1 ? "budget" : "budgets"}
          </span>
        </header>

        {loading ? (
          <div className="budget-loading-state">
            <span className="budget-loading-spinner" />
            <strong>Loading your budgets...</strong>
            <p>Getting your latest spending information.</p>
          </div>
        ) : budgets.length === 0 ? (
          <div className="budget-empty-state">
            <span className="budget-empty-icon">
              <WalletCards size={30} />
            </span>

            <h3>No budgets for this month</h3>

            <p>
              Create a spending limit for a category such as Food, Transport,
              or Shopping. Your recorded expenses will be tracked against it.
            </p>

            <button
              type="button"
              className="budget-btn budget-btn-primary"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Create your first budget
            </button>
          </div>
        ) : (
          <div className="budget-items-grid">
            {budgets.map((budget) => (
              <BudgetCard
                key={budget._id}
                budget={budget}
                onEdit={openEditModal}
                onDelete={deleteBudget}
              />
            ))}
          </div>
        )}
      </section>

      {summary.overspentCount > 0 && !loading && (
        <aside className="budget-insight">
          <span className="budget-insight-icon">
            <AlertTriangle size={21} />
          </span>

          <div>
            <strong>Some budgets need your attention</strong>
            <p>
              You have {summary.overspentCount}{" "}
              {summary.overspentCount === 1 ? "category" : "categories"} over
              budget. Review your spending and adjust your limits if needed.
            </p>
          </div>
        </aside>
      )}

      {!loading && budgets.length > 0 && summary.overspentCount === 0 && (
        <aside className="budget-insight budget-insight-positive">
          <span className="budget-insight-icon">
            <CheckCircle2 size={21} />
          </span>

          <div>
            <strong>Keep up the good work</strong>
            <p>
              None of your categories have exceeded their individual budget
              limits for this period.
            </p>
          </div>

          {summary.totalRemaining >= 0 && (
            <span className="budget-insight-savings">
              <ArrowDownRight size={17} />
              {formatCurrency(summary.totalRemaining)} left
            </span>
          )}
        </aside>
      )}

      {showModal && (
        <BudgetModal
          initialBudget={editingBudget}
          selectedMonth={month}
          selectedYear={year}
          onClose={() => {
            if (!saving) {
              setShowModal(false);
              setEditingBudget(null);
            }
          }}
          onSave={saveBudget}
          saving={saving}
        />
      )}
    </div>
  );
}
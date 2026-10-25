import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import api, { getApiError } from "../services/api";

const CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Housing",
  "Healthcare",
  "Education",
  "Entertainment",
  "Travel",
  "Other",
];

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const emptyForm = {
  type: "expense",
  description: "",
  amount: "",
  category: "Food",
  date: today(),
  notes: "",
};

function getItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.transactions)) return payload.transactions;
  if (Array.isArray(payload?.data?.transactions))
    return payload.data.transactions;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { page, limit: 10 };

      if (typeFilter !== "all") params.type = typeFilter;
      if (categoryFilter !== "all") params.category = categoryFilter;
      if (search.trim()) params.search = search.trim();

      const response = await api.get("/transactions", { params });
      const payload = response.data?.data ?? response.data;

      setTransactions(getItems(payload));

      const pagination =
        payload?.pagination ??
        response.data?.pagination ??
        payload?.meta ??
        {};

      setTotalPages(
        Math.max(1, Number(pagination.totalPages ?? pagination.pages) || 1)
      );

      setTotal(
        Number(
          pagination.total ??
            pagination.totalTransactions ??
            pagination.totalItems
        ) || getItems(payload).length
      );
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, categoryFilter, search]);

  useEffect(() => {
    const timeout = setTimeout(loadTransactions, 250);
    return () => clearTimeout(timeout);
  }, [loadTransactions]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    const amount = Number(form.amount);

    if (!form.description.trim()) {
      setFormError("Please enter a transaction description.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    if (!form.date) {
      setFormError("Please select a transaction date.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/transactions", {
        type: form.type,
        description: form.description.trim(),
        amount,
        category: form.category,
        date: form.date,
        notes: form.notes.trim(),
      });

      setForm(emptyForm);
      setShowForm(false);
      setPage(1);
      setNotice("Transaction added successfully.");
      await loadTransactions();
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(transaction) {
    const id = transaction._id ?? transaction.id;

    if (!id) {
      setError("This transaction has no valid ID and cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${transaction.description || "this transaction"}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    setNotice("");

    try {
      await api.delete(`/transactions/${id}`);
      setNotice("Transaction deleted successfully.");
      await loadTransactions();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDeletingId("");
    }
  }

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  return (
    <section className="page-section transactions-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TRACK EVERY RUPEE</p>
          <h1>Transactions</h1>
          <p>Manage your income and expenses in one place.</p>
        </div>

        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            setForm(emptyForm);
            setFormError("");
            setShowForm(true);
          }}
        >
          <Plus size={18} />
          Add transaction
        </button>
      </div>

      {notice && (
        <div className="alert alert-success" role="status">
          <span>{notice}</span>
          <button
            type="button"
            className="alert-dismiss"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="alert-dismiss"
            onClick={loadTransactions}
            aria-label="Retry loading transactions"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      <div className="transaction-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search transactions..."
            value={search}
            onChange={(event) => changeFilter(setSearch, event.target.value)}
            aria-label="Search transactions"
          />
        </label>

        <select
          className="filter-select"
          value={typeFilter}
          onChange={(event) =>
            changeFilter(setTypeFilter, event.target.value)
          }
          aria-label="Filter by transaction type"
        >
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </select>

        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(event) =>
            changeFilter(setCategoryFilter, event.target.value)
          }
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={loadTransactions}
          disabled={loading}
          aria-label="Refresh transactions"
        >
          <RefreshCw size={16} className={loading ? "loading-icon" : ""} />
        </button>
      </div>

      <div className="panel transactions-panel">
        <div className="panel-heading">
          <div>
            <h2>All transactions</h2>
            <p>
              {total} transaction{total === 1 ? "" : "s"} found
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <RefreshCw size={25} className="loading-icon" />
            <p>Loading your transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={36} />
            <h3>No transactions found</h3>
            <p>
              Add a transaction or change your search and filters to see
              your financial activity.
            </p>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setFormError("");
                setShowForm(true);
              }}
            >
              <Plus size={17} /> Add your first transaction
            </button>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const id = transaction._id ?? transaction.id;
                    const income = transaction.type === "income";

                    return (
                      <tr key={id}>
                        <td>
                          <div className="transaction-cell">
                            <span
                              className={`transaction-icon ${
                                income ? "income" : "expense"
                              }`}
                            >
                              {income ? (
                                <ArrowDownLeft size={18} />
                              ) : (
                                <ArrowUpRight size={18} />
                              )}
                            </span>
                            <div>
                              <strong>
                                {transaction.description || "Untitled transaction"}
                              </strong>
                              {transaction.notes && (
                                <small>{transaction.notes}</small>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="category-badge">
                            {transaction.category || "Other"}
                          </span>
                        </td>
                        <td>
                          {transaction.date
                            ? new Date(
                                `${String(transaction.date).slice(0, 10)}T00:00:00`
                              ).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td>
                          <strong
                            className={
                              income ? "amount-positive" : "amount-negative"
                            }
                          >
                            {income ? "+" : "−"}
                            {currency(transaction.amount)}
                          </strong>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="icon-button danger-action"
                            onClick={() => handleDelete(transaction)}
                            disabled={deletingId === id}
                            aria-label={`Delete ${transaction.description || "transaction"}`}
                            title="Delete transaction"
                          >
                            {deletingId === id ? (
                              <RefreshCw
                                size={17}
                                className="loading-icon"
                              />
                            ) : (
                              <Trash2 size={17} />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="pagination-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => current - 1)}
                >
                  <ChevronLeft size={17} /> Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false);
            }
          }}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-modal-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">RECORD ACTIVITY</p>
                <h2 id="transaction-modal-title">Add transaction</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form className="form-stack" onSubmit={handleSubmit}>
              {formError && (
                <div className="alert alert-error" role="alert">
                  {formError}
                </div>
              )}

              <div className="form-field">
                <span className="field-label">Transaction type</span>
                <div className="type-toggle">
                  <button
                    type="button"
                    className={form.type === "expense" ? "selected expense" : ""}
                    onClick={() =>
                      setForm((previous) => ({
                        ...previous,
                        type: "expense",
                        category: "Food",
                      }))
                    }
                  >
                    <ArrowUpRight size={17} /> Expense
                  </button>
                  <button
                    type="button"
                    className={form.type === "income" ? "selected income" : ""}
                    onClick={() =>
                      setForm((previous) => ({
                        ...previous,
                        type: "income",
                        category: "Salary",
                      }))
                    }
                  >
                    <ArrowDownRight size={17} /> Income
                  </button>
                </div>
              </div>

              <label className="form-field">
                <span className="field-label">Description</span>
                <input
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  placeholder="e.g. Monthly groceries"
                  maxLength={120}
                  required
                />
              </label>

              <div className="form-row">
                <label className="form-field">
                  <span className="field-label">Amount (₹)</span>
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={updateForm}
                    placeholder="0.00"
                    required
                  />
                </label>

                <label className="form-field">
                  <span className="field-label">Date</span>
                  <input
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={updateForm}
                    required
                  />
                </label>
              </div>

              <label className="form-field">
                <span className="field-label">Category</span>
                <select
                  name="category"
                  value={form.category}
                  onChange={updateForm}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span className="field-label">Notes (optional)</span>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={updateForm}
                  placeholder="Add extra details..."
                  rows={3}
                  maxLength={500}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="loading-icon" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Save transaction
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
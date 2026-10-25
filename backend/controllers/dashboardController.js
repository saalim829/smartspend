const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");

const getPeriod = (req) => {
  const now = new Date();

  const month = req.query.month
    ? Number(req.query.month)
    : now.getMonth() + 1;

  const year = req.query.year
    ? Number(req.query.year)
    : now.getFullYear();

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 9999
  ) {
    const error = new Error("Invalid month or year.");
    error.statusCode = 400;
    throw error;
  }

  return { month, year };
};

const getDateRange = (month, year) => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 1)),
});

const getDashboard = async (req, res, next) => {
  try {
    const { month, year } = getPeriod(req);
    const { start, end } = getDateRange(month, year);

    const userId = new mongoose.Types.ObjectId(req.user._id);

    const transactionFilter = {
      user: userId,
      date: { $gte: start, $lt: end },
    };

    const [
      transactionTotals,
      categoryBreakdown,
      monthlyTrends,
      recentTransactions,
      budgetDocuments,
    ] = await Promise.all([
      // Income and expense totals for the selected month.
      Transaction.aggregate([
        { $match: transactionFilter },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Expense totals grouped by category.
      Transaction.aggregate([
        {
          $match: {
            ...transactionFilter,
            type: "expense",
          },
        },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // Income versus expenses over the last six months.
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            date: {
              $gte: new Date(Date.UTC(year, month - 6, 1)),
              $lt: end,
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              type: "$type",
            },
            total: { $sum: "$amount" },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),

      // Most recent transactions in the selected month.
      Transaction.find(transactionFilter)
        .sort({ date: -1, createdAt: -1 })
        .limit(5)
        .select("description amount type category date notes createdAt")
        .lean(),

      // Budgets for the selected month.
      Budget.find({ user: userId, month, year })
        .sort({ category: 1 })
        .lean(),
    ]);

    const incomeRecord = transactionTotals.find(
      (item) => item._id === "income"
    );

    const expenseRecord = transactionTotals.find(
      (item) => item._id === "expense"
    );

    const totalIncome = incomeRecord?.total || 0;
    const totalExpenses = expenseRecord?.total || 0;
    const transactionCount = transactionTotals.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const balance = totalIncome - totalExpenses;

    const savingsRate =
      totalIncome > 0
        ? Number(((balance / totalIncome) * 100).toFixed(2))
        : 0;

    const categoryTotal = categoryBreakdown.reduce(
      (sum, category) => sum + category.total,
      0
    );

    const expensesByCategory = categoryBreakdown.map((category) => ({
      category: category._id,
      amount: category.total,
      transactionCount: category.count,
      percentage:
        categoryTotal > 0
          ? Number(((category.total / categoryTotal) * 100).toFixed(2))
          : 0,
    }));

    // Give the chart all six months, including months without transactions.
    const trendsByMonth = new Map();

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(Date.UTC(year, month - 1 - offset, 1));
      const key = `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1
      ).padStart(2, "0")}`;

      trendsByMonth.set(key, {
        month: date.getUTCMonth() + 1,
        year: date.getUTCFullYear(),
        label: date.toLocaleString("en-US", {
          month: "short",
          timeZone: "UTC",
        }),
        income: 0,
        expenses: 0,
      });
    }

    for (const item of monthlyTrends) {
      const key = `${item._id.year}-${String(item._id.month).padStart(
        2,
        "0"
      )}`;

      const monthEntry = trendsByMonth.get(key);

      if (monthEntry) {
        if (item._id.type === "income") {
          monthEntry.income = item.total;
        } else if (item._id.type === "expense") {
          monthEntry.expenses = item.total;
        }
      }
    }

    const monthlyComparison = Array.from(trendsByMonth.values());

    const budgets = await Promise.all(
      budgetDocuments.map(async (budget) => {
        const spentResult = await Transaction.aggregate([
          {
            $match: {
              user: userId,
              type: "expense",
              category: budget.category,
              date: { $gte: start, $lt: end },
            },
          },
          {
            $group: {
              _id: null,
              spent: { $sum: "$amount" },
            },
          },
        ]);

        const spent = spentResult[0]?.spent || 0;
        const remaining = budget.limit - spent;

        return {
          id: budget._id,
          category: budget.category,
          limit: budget.limit,
          spent,
          remaining,
          percentageUsed:
            budget.limit > 0
              ? Number(((spent / budget.limit) * 100).toFixed(2))
              : 0,
          overspent: spent > budget.limit,
        };
      })
    );

    res.status(200).json({
      success: true,
      period: { month, year },
      overview: {
        totalIncome,
        totalExpenses,
        balance,
        savingsRate,
        transactionCount,
        incomeTransactionCount: incomeRecord?.count || 0,
        expenseTransactionCount: expenseRecord?.count || 0,
      },
      expensesByCategory,
      monthlyComparison,
      recentTransactions,
      budgets,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };
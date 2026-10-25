const mongoose = require("mongoose");
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");

const CURRENT_YEAR_MIN = 2000;
const CURRENT_YEAR_MAX = 9999;
const MAX_BUDGET_LIMIT = 1_000_000_000_000;

// Validate MongoDB document IDs.
function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// Validate month, year, and budget limit.
function validateBudgetInput(body, { partial = false } = {}) {
  const errors = {};
  const data = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      data,
      errors: { body: "A valid JSON object is required." },
    };
  }

  const allowedFields = ["category", "limit", "month", "year"];

  const unknownFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field)
  );

  if (unknownFields.length) {
    errors.fields = `Unsupported field(s): ${unknownFields.join(", ")}`;
  }

  const has = (field) =>
    Object.prototype.hasOwnProperty.call(body, field);

  if (!partial || has("category")) {
    if (typeof body.category !== "string") {
      errors.category = "Category must be a string.";
    } else {
      const category = body.category.trim();

      if (!category || category.length > 50) {
        errors.category = "Category must contain 1–50 characters.";
      } else {
        data.category = category;
      }
    }
  }

  if (!partial || has("limit")) {
    const limit = body.limit;

    if (
      limit === "" ||
      limit === null ||
      limit === undefined ||
      typeof limit === "boolean"
    ) {
      errors.limit = "A valid budget limit is required.";
    } else {
      const parsedLimit = Number(limit);

      if (
        !Number.isFinite(parsedLimit) ||
        parsedLimit <= 0 ||
        parsedLimit > MAX_BUDGET_LIMIT
      ) {
        errors.limit = `Budget limit must be greater than 0 and no more than ${MAX_BUDGET_LIMIT}.`;
      } else {
        data.limit = parsedLimit;
      }
    }
  }

  if (!partial || has("month")) {
    const month = body.month;

    if (
      month === "" ||
      month === null ||
      month === undefined ||
      !Number.isInteger(Number(month)) ||
      Number(month) < 1 ||
      Number(month) > 12
    ) {
      errors.month = "Month must be an integer from 1 to 12.";
    } else {
      data.month = Number(month);
    }
  }

  if (!partial || has("year")) {
    const year = body.year;

    if (
      year === "" ||
      year === null ||
      year === undefined ||
      !Number.isInteger(Number(year)) ||
      Number(year) < CURRENT_YEAR_MIN ||
      Number(year) > CURRENT_YEAR_MAX
    ) {
      errors.year = `Year must be an integer between ${CURRENT_YEAR_MIN} and ${CURRENT_YEAR_MAX}.`;
    } else {
      data.year = Number(year);
    }
  }

  return { data, errors };
}

// Validate optional month/year query parameters.
function parsePeriod(query) {
  const now = new Date();

  const month = query.month === undefined
    ? now.getMonth() + 1
    : Number(query.month);

  const year = query.year === undefined
    ? now.getFullYear()
    : Number(query.year);

  if (
    query.month !== undefined &&
    (!/^\d+$/.test(String(query.month)) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12)
  ) {
    return { error: "Month must be an integer from 1 to 12." };
  }

  if (
    query.year !== undefined &&
    (!/^\d+$/.test(String(query.year)) ||
      !Number.isInteger(year) ||
      year < CURRENT_YEAR_MIN ||
      year > CURRENT_YEAR_MAX)
  ) {
    return {
      error: `Year must be an integer between ${CURRENT_YEAR_MIN} and ${CURRENT_YEAR_MAX}.`,
    };
  }

  return { month, year };
}

// Build the UTC date interval for a given month.
function getMonthRange(month, year) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

// Calculate actual spending for one category and month.
async function calculateBudgetProgress(userId, category, month, year) {
  const { start, end } = getMonthRange(month, year);

  const result = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        category,
        type: "expense",
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: null,
        spent: { $sum: "$amount" },
        transactionCount: { $sum: 1 },
      },
    },
  ]);

  return {
    spent: result[0]?.spent || 0,
    transactionCount: result[0]?.transactionCount || 0,
  };
}

// Add calculated spending information to a budget.
async function serializeBudget(budget) {
  const progress = await calculateBudgetProgress(
    budget.user,
    budget.category,
    budget.month,
    budget.year
  );

  const remaining = budget.limit - progress.spent;
  const percentageUsed =
    (progress.spent / budget.limit) * 100;

  return {
    ...budget.toObject(),
    spent: progress.spent,
    remaining,
    percentageUsed: Number(percentageUsed.toFixed(2)),
    overspent: progress.spent > budget.limit,
    transactionCount: progress.transactionCount,
  };
}

// POST /api/budgets
async function createBudget(req, res, next) {
  try {
    const { data, errors } = validateBudgetInput(req.body);

    if (Object.keys(errors).length) {
      return res.status(400).json({
        success: false,
        message: "Please correct the budget details.",
        errors,
      });
    }

    const existingBudget = await Budget.findOne({
      user: req.user._id,
      category: data.category,
      month: data.month,
      year: data.year,
    });

    if (existingBudget) {
      return res.status(409).json({
        success: false,
        message:
          "A budget already exists for this category and month.",
      });
    }

    const budget = await Budget.create({
      ...data,
      user: req.user._id,
    });

    const result = await serializeBudget(budget);

    return res.status(201).json({
      success: true,
      message: "Budget created successfully.",
      budget: result,
    });
  } catch (error) {
    // Protect against duplicate requests racing each other.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A budget already exists for this category and month.",
      });
    }

    next(error);
  }
}

// GET /api/budgets?month=10&year=2026
async function getBudgets(req, res, next) {
  try {
    const period = parsePeriod(req.query);

    if (period.error) {
      return res.status(400).json({
        success: false,
        message: period.error,
      });
    }

    const budgets = await Budget.find({
      user: req.user._id,
      month: period.month,
      year: period.year,
    }).sort({ category: 1 });

    const results = await Promise.all(
      budgets.map(serializeBudget)
    );

    const totalLimit = results.reduce(
      (sum, budget) => sum + budget.limit,
      0
    );

    const totalSpent = results.reduce(
      (sum, budget) => sum + budget.spent,
      0
    );

    return res.status(200).json({
      success: true,
      period: {
        month: period.month,
        year: period.year,
      },
      summary: {
        totalBudget: totalLimit,
        totalSpent,
        totalRemaining: totalLimit - totalSpent,
        budgetCount: results.length,
        overspentCount: results.filter(
          (budget) => budget.overspent
        ).length,
      },
      budgets: results,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/budgets/:id
async function getBudgetById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID.",
      });
    }

    const budget = await Budget.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found.",
      });
    }

    return res.status(200).json({
      success: true,
      budget: await serializeBudget(budget),
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/budgets/:id
async function updateBudget(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID.",
      });
    }

    const { data, errors } = validateBudgetInput(req.body, {
      partial: true,
    });

    if (Object.keys(errors).length) {
      return res.status(400).json({
        success: false,
        message: "Please correct the budget details.",
        errors,
      });
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    // Find the budget using its owner, not just its ID.
    const existing = await Budget.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Budget not found.",
      });
    }

    const nextCategory = data.category ?? existing.category;
    const nextMonth = data.month ?? existing.month;
    const nextYear = data.year ?? existing.year;

    const duplicate = await Budget.findOne({
      _id: { $ne: existing._id },
      user: req.user._id,
      category: nextCategory,
      month: nextMonth,
      year: nextYear,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "A budget already exists for this category and month.",
      });
    }

    Object.assign(existing, data);
    await existing.save();

    return res.status(200).json({
      success: true,
      message: "Budget updated successfully.",
      budget: await serializeBudget(existing),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A budget already exists for this category and month.",
      });
    }

    next(error);
  }
}

// DELETE /api/budgets/:id
async function deleteBudget(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID.",
      });
    }

    const budget = await Budget.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Budget deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
};
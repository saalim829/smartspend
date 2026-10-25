const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");

const ALLOWED_TYPES = ["income", "expense"];

const ALLOWED_FIELDS = [
  "description",
  "amount",
  "type",
  "category",
  "date",
  "notes",
];

const MAX_AMOUNT = 1_000_000_000_000;

// Parse and validate transaction input.
function validateTransactionInput(body, { partial = false } = {}) {
  const errors = {};
  const data = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      data,
      errors: { body: "A JSON object is required." },
    };
  }

  const unknownFields = Object.keys(body).filter(
    (key) => !ALLOWED_FIELDS.includes(key)
  );

  if (unknownFields.length) {
    errors.fields = `Unsupported field(s): ${unknownFields.join(", ")}`;
  }

  const has = (field) =>
    Object.prototype.hasOwnProperty.call(body, field);

  if (!partial || has("description")) {
    if (typeof body.description !== "string") {
      errors.description = "Description must be a string.";
    } else {
      const description = body.description.trim();

      if (!description || description.length > 120) {
        errors.description =
          "Description must contain 1–120 characters.";
      } else {
        data.description = description;
      }
    }
  }

  if (!partial || has("amount")) {
    const amount = body.amount;

    if (
      amount === "" ||
      amount === null ||
      amount === undefined ||
      typeof amount === "boolean"
    ) {
      errors.amount = "A valid positive amount is required.";
    } else {
      const parsedAmount = Number(amount);

      if (
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0 ||
        parsedAmount > MAX_AMOUNT
      ) {
        errors.amount = `Amount must be greater than 0 and no more than ${MAX_AMOUNT}.`;
      } else {
        data.amount = parsedAmount;
      }
    }
  }

  if (!partial || has("type")) {
    if (
      typeof body.type !== "string" ||
      !ALLOWED_TYPES.includes(body.type)
    ) {
      errors.type = "Type must be either income or expense.";
    } else {
      data.type = body.type;
    }
  }

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

  if (!partial || has("date")) {
    const date = body.date;

    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date) ||
      !Number.isFinite(Date.parse(date))
    ) {
      errors.date = "Provide a valid ISO date or datetime.";
    } else {
      const parsedDate = new Date(date);

      // Reject impossible calendar dates such as 2026-02-31.
      const datePart = date.slice(0, 10);
      const [year, month, day] = datePart.split("-").map(Number);
      const calendarCheck = new Date(Date.UTC(year, month - 1, day));

      if (
        calendarCheck.getUTCFullYear() !== year ||
        calendarCheck.getUTCMonth() !== month - 1 ||
        calendarCheck.getUTCDate() !== day
      ) {
        errors.date = "Provide a real calendar date.";
      } else {
        data.date = parsedDate;
      }
    }
  }

  if (has("notes")) {
    if (typeof body.notes !== "string") {
      errors.notes = "Notes must be a string.";
    } else if (body.notes.trim().length > 500) {
      errors.notes = "Notes cannot exceed 500 characters.";
    } else {
      data.notes = body.notes.trim();
    }
  } else if (!partial) {
    data.notes = "";
  }

  return { data, errors };
}

function parseDateFilter(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function validObjectId(id) {
  return mongoose.isValidObjectId(id);
}

// POST /api/transactions
async function createTransaction(req, res, next) {
  try {
    const { data, errors } = validateTransactionInput(req.body);

    if (Object.keys(errors).length) {
      return res.status(400).json({
        success: false,
        message: "Please correct the transaction details.",
        errors,
      });
    }

    const transaction = await Transaction.create({
      ...data,
      user: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully.",
      transaction,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/transactions
async function getTransactions(req, res, next) {
  try {
    const {
      type,
      category,
      startDate,
      endDate,
      page = "1",
      limit = "10",
      sort = "newest",
    } = req.query;

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (
      !/^\d+$/.test(String(page)) ||
      !Number.isSafeInteger(pageNumber) ||
      pageNumber < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer.",
      });
    }

    if (
      !/^\d+$/.test(String(limit)) ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be an integer between 1 and 100.",
      });
    }

    if (type && !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be income or expense.",
      });
    }

    if (
      sort &&
      !["newest", "oldest", "amountAsc", "amountDesc"].includes(sort)
    ) {
      return res.status(400).json({
        success: false,
        message: "Unsupported sort option.",
      });
    }

    const filter = { user: req.user._id };

    if (type) filter.type = type;

    if (category) {
      if (typeof category !== "string" || category.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: "Category filter must be at most 50 characters.",
        });
      }

      filter.category = category.trim();
    }

    if (startDate || endDate) {
      const range = {};

      if (startDate) {
        const start = parseDateFilter(startDate);

        if (!start) {
          return res.status(400).json({
            success: false,
            message: "startDate must be a valid YYYY-MM-DD date.",
          });
        }

        range.$gte = start;
      }

      if (endDate) {
        const end = parseDateFilter(endDate);

        if (!end) {
          return res.status(400).json({
            success: false,
            message: "endDate must be a valid YYYY-MM-DD date.",
          });
        }

        // Exclusive upper bound includes the entire end date.
        end.setUTCDate(end.getUTCDate() + 1);
        range.$lt = end;
      }

      if (
        range.$gte &&
        range.$lt &&
        range.$gte >= range.$lt
      ) {
        return res.status(400).json({
          success: false,
          message: "startDate must not be after endDate.",
        });
      }

      filter.date = range;
    }

    const sortOptions = {
      newest: { date: -1, _id: -1 },
      oldest: { date: 1, _id: 1 },
      amountAsc: { amount: 1, _id: 1 },
      amountDesc: { amount: -1, _id: -1 },
    };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort(sortOptions[sort || "newest"])
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean(),

      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      transactions,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/transactions/summary
async function getTransactionSummary(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const match = { user: req.user._id };

    if (startDate || endDate) {
      const range = {};

      if (startDate) {
        const start = parseDateFilter(startDate);

        if (!start) {
          return res.status(400).json({
            success: false,
            message: "startDate must be a valid YYYY-MM-DD date.",
          });
        }

        range.$gte = start;
      }

      if (endDate) {
        const end = parseDateFilter(endDate);

        if (!end) {
          return res.status(400).json({
            success: false,
            message: "endDate must be a valid YYYY-MM-DD date.",
          });
        }

        end.setUTCDate(end.getUTCDate() + 1);
        range.$lt = end;
      }

      if (range.$gte && range.$lt && range.$gte >= range.$lt) {
        return res.status(400).json({
          success: false,
          message: "startDate must not be after endDate.",
        });
      }

      match.date = range;
    }

    const [totals, categories, transactionCount] = await Promise.all([
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      Transaction.aggregate([
        { $match: { ...match, type: "expense" } },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1, _id: 1 } },
      ]),

      Transaction.countDocuments(match),
    ]);

    const income = totals.find((item) => item._id === "income");
    const expense = totals.find((item) => item._id === "expense");

    const totalIncome = income?.total || 0;
    const totalExpense = expense?.total || 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount,
        incomeCount: income?.count || 0,
        expenseCount: expense?.count || 0,
      },
      expensesByCategory: categories.map((item) => ({
        category: item._id,
        total: item.total,
        count: item.count,
      })),
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/transactions/:id
async function getTransactionById(req, res, next) {
  try {
    const { id } = req.params;

    if (!validObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID.",
      });
    }

    const transaction = await Transaction.findOne({
      _id: id,
      user: req.user._id,
    }).lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/transactions/:id
async function updateTransaction(req, res, next) {
  try {
    const { id } = req.params;

    if (!validObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID.",
      });
    }

    const { data, errors } = validateTransactionInput(req.body, {
      partial: true,
    });

    if (Object.keys(errors).length) {
      return res.status(400).json({
        success: false,
        message: "Please correct the transaction details.",
        errors,
      });
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update.",
      });
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: id,
        user: req.user._id,
      },
      { $set: data },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully.",
      transaction,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/transactions/:id
async function deleteTransaction(req, res, next) {
  try {
    const { id } = req.params;

    if (!validObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID.",
      });
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
};

const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    limit: {
      type: Number,
      required: true,
      min: [0.01, "Budget limit must be greater than zero"],
      validate: {
        validator: Number.isFinite,
        message: "Budget limit must be a finite number",
      },
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 9999,
    },
  },
  { timestamps: true }
);

budgetSchema.index(
  { user: 1, category: 1, month: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model("Budget", budgetSchema);
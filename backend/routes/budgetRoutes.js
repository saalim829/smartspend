const express = require("express");

const {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
} = require("../controllers/budgetController");

const { protect } = require("../middleware/auth");

const router = express.Router();

// Require authentication for every budget endpoint.
router.use(protect);

router.route("/")
  .post(createBudget)
  .get(getBudgets);

router.route("/:id")
  .get(getBudgetById)
  .patch(updateBudget)
  .delete(deleteBudget);

module.exports = router;
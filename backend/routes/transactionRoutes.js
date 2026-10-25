const express = require("express");

const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
} = require("../controllers/transactionController");

const { protect } = require("../middleware/auth");

const router = express.Router();

// Every transaction endpoint requires authentication.
router.use(protect);

// Register the specific /summary route BEFORE /:id.
router.get("/summary", getTransactionSummary);

router
  .route("/")
  .post(createTransaction)
  .get(getTransactions);

router
  .route("/:id")
  .get(getTransactionById)
  .patch(updateTransaction)
  .delete(deleteTransaction);

module.exports = router;

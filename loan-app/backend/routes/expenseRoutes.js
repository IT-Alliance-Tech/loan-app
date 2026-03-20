const express = require("express");
const router = express.Router();
const {
  createExpense,
  getAllExpenses,
  searchLoanInfo,
  getLoanExpensesTotal,
} = require("../controllers/expenseController");
const { isAuthenticated, authorizePermissions } = require("../middlewares/auth");

router.use(isAuthenticated);

router.get("/search", authorizePermissions("expenses.view"), searchLoanInfo);
router.get("/loan/:loanId", authorizePermissions("expenses.view"), getLoanExpensesTotal);

router
  .route("/")
  .get(authorizePermissions("expenses.view"), getAllExpenses)
  .post(authorizePermissions("expenses.create"), createExpense);

module.exports = router;

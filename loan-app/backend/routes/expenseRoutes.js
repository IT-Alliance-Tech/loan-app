const express = require("express");
const router = express.Router();
const {
  createExpense,
  getAllExpenses,
  searchLoanInfo,
  getLoanExpensesTotal,
} = require("../controllers/expenseController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

router.use(isAuthenticated);

router.get("/search", searchLoanInfo);
router.get("/loan/:loanId", getLoanExpensesTotal);

router
  .route("/")
  .get(getAllExpenses)
  .post(authorizeRoles("SUPER_ADMIN"), createExpense);

module.exports = router;

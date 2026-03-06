const Expense = require("../models/Expense");
const Loan = require("../models/Loan");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private/Admin
const createExpense = asyncHandler(async (req, res, next) => {
  const { loanNumber, vehicleNumber, particulars, date, amount } = req.body;

  if (!loanNumber || !particulars || !amount) {
    return next(
      new ErrorHandler(
        "Please provide loan number, particulars and amount",
        400,
      ),
    );
  }

  // Find loanId if it exists
  const loan = await Loan.findOne({ loanNumber });

  const expense = await Expense.create({
    loanId: loan ? loan._id : null,
    loanNumber,
    vehicleNumber: vehicleNumber || (loan ? loan.vehicleNumber : null),
    particulars,
    date: date || Date.now(),
    amount,
    createdBy: req.user._id,
  });

  sendResponse(
    res,
    201,
    "success",
    "Expense recorded successfully",
    null,
    expense,
  );
});

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
const getAllExpenses = asyncHandler(async (req, res, next) => {
  const expenses = await Expense.find().sort({ date: -1, createdAt: -1 });

  sendResponse(
    res,
    200,
    "success",
    "Expenses fetched successfully",
    null,
    expenses,
  );
});

// @desc    Search loan/vehicle info
// @route   GET /api/expenses/search
// @access  Private
const searchLoanInfo = asyncHandler(async (req, res, next) => {
  const { q } = req.query; // query string

  if (!q) {
    return next(new ErrorHandler("Search query is required", 400));
  }

  const loan = await Loan.findOne({
    $or: [
      { loanNumber: { $regex: q, $options: "i" } },
      { vehicleNumber: { $regex: q, $options: "i" } },
    ],
  }).select("loanNumber vehicleNumber customerName");

  if (!loan) {
    return next(new ErrorHandler("No matching loan or vehicle found", 404));
  }

  sendResponse(res, 200, "success", "Loan info found", null, loan);
});

// @desc    Get total expenses for a loan
// @route   GET /api/expenses/loan/:loanId
// @access  Private
const getLoanExpensesTotal = asyncHandler(async (req, res, next) => {
  const { loanId } = req.params;

  const expenses = await Expense.find({ loanId });
  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  sendResponse(res, 200, "success", "Total expenses fetched", null, {
    total,
    count: expenses.length,
  });
});

module.exports = {
  createExpense,
  getAllExpenses,
  searchLoanInfo,
  getLoanExpensesTotal,
};

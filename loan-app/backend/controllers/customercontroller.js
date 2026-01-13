const Loan = require("../models/Loan");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const calculateEMI = (principal, roi, tenureMonths) => {
  const r = roi / 12 / 100;
  const n = tenureMonths;
  if (r === 0) return parseFloat((principal / n).toFixed(2));
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return parseFloat(emi.toFixed(2));
};

const createCustomerLoan = asyncHandler(async (req, res, next) => {
  const {
    loanNumber,
    customerName,
    mobileNumber,
    alternateMobile,
    address,
    principalAmount,
    annualInterestRate,
    tenureMonths,
    loanStartDate,
    remarks,
  } = req.body;

  if (
    !loanNumber ||
    !customerName ||
    !mobileNumber ||
    !address ||
    !principalAmount ||
    !annualInterestRate ||
    !tenureMonths ||
    !loanStartDate
  ) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  const existingLoan = await Loan.findOne({ loanNumber });
  if (existingLoan) {
    return next(new ErrorHandler("Loan number already exists", 400));
  }

  const monthlyEMI = calculateEMI(
    principalAmount,
    annualInterestRate,
    tenureMonths
  );

  const loan = await Loan.create({
    loanNumber,
    customerName,
    mobileNumber,
    alternateMobile,
    address,
    principalAmount,
    annualInterestRate,
    tenureMonths,
    monthlyEMI,
    loanStartDate,
    remarks,
    createdBy: req.user._id,
  });

  sendResponse(
    res,
    201,
    "success",
    "Customer and Loan created successfully",
    null,
    loan
  );
});

const getAllCustomers = asyncHandler(async (req, res, next) => {
  const customers = await Loan.find().sort({ createdAt: -1 });
  sendResponse(
    res,
    200,
    "success",
    "Customers fetched successfully",
    null,
    customers
  );
});

const getCustomerByLoanNumber = asyncHandler(async (req, res, next) => {
  const customer = await Loan.findOne({ loanNumber: req.params.loanNumber });
  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }
  sendResponse(res, 200, "success", "Customer found", null, customer);
});

module.exports = {
  createCustomerLoan,
  getAllCustomers,
  getCustomerByLoanNumber,
};

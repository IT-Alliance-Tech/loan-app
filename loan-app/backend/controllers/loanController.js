const Loan = require("../models/Loan");
const EMI = require("../models/EMI");
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

const createLoan = asyncHandler(async (req, res, next) => {
  const {
    siNo,
    loanNumber,
    customerName,
    address,
    ownRent,
    mobileNumber,
    panNumber,
    aadharNumber,
    principalAmount,
    processingFeeRate,
    processingFee,
    tenureType,
    tenureMonths,
    annualInterestRate,
    dateLoanDisbursed,
    emiStartDate,
    emiEndDate,
    totalInterestAmount,
    vehicleNumber,
    chassisNumber,
    model,
    typeOfVehicle,
    ywBoard,
    docChecklist,
    dealerName,
    dealerNumber,
    hpEntry,
    fcDate,
    insuranceDate,
    rtoWorkPending,
  } = req.body;

  if (
    !loanNumber ||
    !customerName ||
    !mobileNumber ||
    !principalAmount ||
    !annualInterestRate ||
    !tenureMonths
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
    siNo,
    loanNumber,
    customerName,
    address,
    ownRent,
    mobileNumber,
    panNumber,
    aadharNumber,
    principalAmount,
    processingFeeRate,
    processingFee,
    tenureType,
    tenureMonths,
    annualInterestRate,
    dateLoanDisbursed,
    emiStartDate,
    emiEndDate,
    monthlyEMI,
    totalInterestAmount,
    vehicleNumber,
    chassisNumber,
    model,
    typeOfVehicle,
    ywBoard,
    docChecklist,
    dealerName,
    dealerNumber,
    hpEntry,
    fcDate,
    insuranceDate,
    rtoWorkPending,
    createdBy: req.user._id,
  });

  // Generate EMIs
  const emis = [];
  let currentEmiDate = new Date(
    loan.emiStartDate || loan.dateLoanDisbursed || new Date()
  );

  for (let i = 1; i <= tenureMonths; i++) {
    emis.push({
      loanId: loan._id,
      loanNumber: loan.loanNumber,
      customerName: loan.customerName,
      emiNumber: i,
      dueDate: new Date(currentEmiDate),
      emiAmount: monthlyEMI,
      status: "Pending",
    });
    // Increment month
    currentEmiDate.setMonth(currentEmiDate.getMonth() + 1);
  }

  await EMI.insertMany(emis);

  sendResponse(
    res,
    201,
    "success",
    "Loan created and EMIs generated successfully",
    null,
    loan
  );
});

const getAllLoans = asyncHandler(async (req, res, next) => {
  const loans = await Loan.find().sort({ createdAt: -1 });
  sendResponse(res, 200, "success", "Loans fetched successfully", null, loans);
});

const getLoanByLoanNumber = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findOne({ loanNumber: req.params.loanNumber });
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }
  sendResponse(res, 200, "success", "Loan found", null, loan);
});

const getLoanById = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }
  sendResponse(res, 200, "success", "Loan found", null, loan);
});

const updateLoan = asyncHandler(async (req, res, next) => {
  let loan = await Loan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  const updatedPrincipal =
    req.body.principalAmount !== undefined
      ? req.body.principalAmount
      : loan.principalAmount;
  const updatedRoi =
    req.body.annualInterestRate !== undefined
      ? req.body.annualInterestRate
      : loan.annualInterestRate;
  const updatedTenure =
    req.body.tenureMonths !== undefined
      ? req.body.tenureMonths
      : loan.tenureMonths;

  const monthlyEMI = calculateEMI(updatedPrincipal, updatedRoi, updatedTenure);

  loan = await Loan.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      monthlyEMI,
    },
    { new: true, runValidators: true }
  );

  sendResponse(res, 200, "success", "Loan updated successfully", null, loan);
});

const toggleSeizedStatus = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  loan.isSeized = !loan.isSeized;
  await loan.save();

  sendResponse(
    res,
    200,
    "success",
    `Loan ${loan.isSeized ? "seized" : "unseized"} successfully`,
    null,
    loan
  );
});

module.exports = {
  createLoan,
  getAllLoans,
  getLoanByLoanNumber,
  getLoanById,
  updateLoan,
  toggleSeizedStatus,
};

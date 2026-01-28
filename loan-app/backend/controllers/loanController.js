const Loan = require("../models/Loan");
const EMI = require("../models/EMI");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const calculateEMI = (principal, roi, tenureMonths) => {
  const p = parseFloat(principal);
  const r = parseFloat(roi);
  const n = parseInt(tenureMonths);
  if (!p || !n) return 0;

  // Flat Interest Calculation: EMI = (Principal / Tenure) + (Principal * Rate / 100)
  const monthlyInterest = p * (r / 100);
  const monthlyPrincipal = p / n;
  const emi = monthlyPrincipal + monthlyInterest;

  return parseFloat(emi.toFixed(2));
};

const calculateEMIApi = asyncHandler(async (req, res, next) => {
  const { principalAmount, annualInterestRate, tenureMonths } = req.body;

  if (!principalAmount || !annualInterestRate || !tenureMonths) {
    return next(
      new ErrorHandler("Please provide principal, rate and tenure", 400),
    );
  }

  const emi = calculateEMI(principalAmount, annualInterestRate, tenureMonths);

  sendResponse(res, 200, "success", "EMI calculated successfully", null, {
    emi,
  });
});

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
    engineNumber,
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
    additionalMobileNumbers,
    guarantorName,
    guarantorMobileNumbers,
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
    tenureMonths,
  );

  const calculatedTotalInterest =
    parseFloat(principalAmount) *
    (parseFloat(annualInterestRate) / 100) *
    parseInt(tenureMonths);

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
    totalInterestAmount: calculatedTotalInterest,
    vehicleNumber,
    chassisNumber,
    engineNumber,
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
    additionalMobileNumbers,
    guarantorName,
    guarantorMobileNumbers,
    createdBy: req.user._id,
  });

  // Generate EMIs
  const emis = [];
  let currentEmiDate = new Date(
    loan.emiStartDate || loan.dateLoanDisbursed || new Date(),
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
    loan,
  );
});

const getAllLoans = asyncHandler(async (req, res, next) => {
  const { loanNumber, customerName, mobileNumber, tenureMonths, status } =
    req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};

  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (mobileNumber)
    query.mobileNumber = { $regex: mobileNumber, $options: "i" };
  if (tenureMonths) query.tenureMonths = tenureMonths;
  if (status) {
    if (status === "Seized") query.isSeized = true;
    if (status === "Active") query.isSeized = false;
  }

  const total = await Loan.countDocuments(query);
  const loans = await Loan.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  sendResponse(res, 200, "success", "Loans fetched successfully", null, {
    loans,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
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
  const calculatedTotalInterest =
    parseFloat(updatedPrincipal) *
    (parseFloat(updatedRoi) / 100) *
    parseInt(updatedTenure);

  loan = await Loan.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      monthlyEMI,
      totalInterestAmount: calculatedTotalInterest,
    },
    { new: true, runValidators: true },
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
    loan,
  );
});
// export
module.exports = {
  createLoan,
  getAllLoans,
  getLoanByLoanNumber,
  getLoanById,
  updateLoan,
  toggleSeizedStatus,
  calculateEMIApi,
};

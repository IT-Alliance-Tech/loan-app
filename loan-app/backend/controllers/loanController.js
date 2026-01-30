const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const EMI = require("../models/EMI");
const ErrorHandler = require("../utils/ErrorHandler");
const { addMonths } = require("date-fns");
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
    status,
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
    status,
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
      dueDate: addMonths(new Date(currentEmiDate), i - 1),
      emiAmount: monthlyEMI,
      status: "Pending",
    });
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

const getPendingPayments = asyncHandler(async (req, res, next) => {
  const { customerName, loanNumber, vehicleNumber, status } = req.query;

  let query = {};

  if (customerName) {
    query.customerName = { $regex: customerName, $options: "i" };
  }
  if (loanNumber) {
    query.loanNumber = { $regex: loanNumber, $options: "i" };
  }
  if (vehicleNumber) {
    query.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
  }

  const pendingPayments = await Loan.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "emis",
        localField: "_id",
        foreignField: "loanId",
        as: "emis",
      },
    },
    {
      $addFields: {
        pendingEmis: {
          $filter: {
            input: "$emis",
            as: "emi",
            cond: {
              $and: [
                status
                  ? { $eq: ["$$emi.status", status] }
                  : { $ne: ["$$emi.status", "Paid"] },
                { $lte: ["$$emi.dueDate", new Date()] },
              ],
            },
          },
        },
      },
    },
    { $unwind: "$pendingEmis" },
    {
      $project: {
        _id: "$pendingEmis._id",
        loanId: "$_id",
        loanNumber: 1,
        customerName: 1,
        mobileNumber: 1,
        vehicleNumber: 1,
        model: 1,
        emiAmount: "$pendingEmis.emiAmount",
        amountPaid: "$pendingEmis.amountPaid",
        dueDate: "$pendingEmis.dueDate",
        remarks: { $ifNull: ["$pendingEmis.remarks", "$paymentStatus", ""] },
        emiNumber: "$pendingEmis.emiNumber",
      },
    },
    { $sort: { dueDate: 1 } },
  ]);

  sendResponse(
    res,
    200,
    "success",
    "Pending payments fetched successfully",
    null,
    pendingPayments,
  );
});

const getPendingEmiDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  console.log("Fetching EMI Details for ID:", id);
  const emiDetails = await EMI.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: "loans",
        localField: "loanId",
        foreignField: "_id",
        as: "loan",
      },
    },
    { $unwind: "$loan" },
    {
      $project: {
        _id: 1,
        loanId: "$loan._id",
        loanNumber: "$loan.loanNumber",
        customerName: "$loan.customerName",
        mobileNumber: "$loan.mobileNumber",
        address: "$loan.address",
        guarantorName: "$loan.guarantorName",
        guarantorMobileNumber: "$loan.guarantorMobileNumber",
        vehicleNumber: "$loan.vehicleNumber",
        model: "$loan.model",
        engineNumber: "$loan.engineNumber",
        chassisNumber: "$loan.chassisNumber",
        principalAmount: "$loan.principalAmount",
        monthlyEMI: "$loan.monthlyEMI",
        emiAmount: "$emiAmount",
        amountPaid: "$amountPaid",
        status: "$status",
        dueDate: "$dueDate",
        remarks: { $ifNull: ["$remarks", "$loan.paymentStatus", ""] },
        emiNumber: 1,
      },
    },
  ]);

  if (!emiDetails || emiDetails.length === 0) {
    return next(new ErrorHandler(`EMI details not found for ID: ${id}`, 404));
  }

  sendResponse(
    res,
    200,
    "success",
    "EMI details fetched successfully",
    null,
    emiDetails[0],
  );
});

const updatePaymentStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  const loan = await Loan.findByIdAndUpdate(
    id,
    { paymentStatus },
    { new: true, runValidators: true },
  );

  if (!loan) {
    return next(new ErrorResponse("Loan not found", 404));
  }

  sendResponse(
    res,
    200,
    "success",
    "Payment status updated successfully",
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
  getPendingPayments,
  getPendingEmiDetails,
  updatePaymentStatus,
};

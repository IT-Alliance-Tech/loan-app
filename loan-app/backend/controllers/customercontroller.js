const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const EMI = require("../models/EMI");
const ErrorHandler = require("../utils/ErrorHandler");
const { formatLoanResponse } = require("../utils/loanFormatter");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const calculateEMI = (principal, roi, tenureMonths) => {
  const p = parseFloat(principal);
  const r = parseFloat(roi);
  const n = parseInt(tenureMonths);
  if (!p || !n) return 0;

  const monthlyInterest = p * (r / 100);
  const monthlyPrincipal = p / n;
  const emi = monthlyPrincipal + monthlyInterest;

  return parseFloat(emi.toFixed(2));
};

const createCustomerLoan = asyncHandler(async (req, res, next) => {
  const {
    loanNumber,
    customerName,
    mobileNumbers,
    alternateMobile,
    address,
    principalAmount,
    annualInterestRate,
    tenureMonths,
    loanStartDate,
    remarks,
    ownRent,
    panNumber,
    aadharNumber,
    processingFee,
    emiStartDate,
    guarantorName,
    guarantorMobileNumbers,
    status,
  } = req.body;

  if (
    !loanNumber ||
    !customerName ||
    !mobileNumbers ||
    mobileNumbers.length === 0 ||
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
    tenureMonths,
  );

  const calculatedTotalInterest =
    parseFloat(principalAmount) *
    (parseFloat(annualInterestRate) / 100) *
    parseInt(tenureMonths);

  const loan = await Loan.create({
    loanNumber,
    customerName,
    mobileNumbers,
    alternateMobile,
    address,
    ownRent,
    panNumber,
    aadharNumber,
    principalAmount,
    processingFee,
    annualInterestRate,
    tenureMonths,
    monthlyEMI,
    totalInterestAmount: calculatedTotalInterest,
    loanStartDate,
    emiStartDate: emiStartDate || loanStartDate,
    remarks,
    guarantorName,
    guarantorMobileNumbers,
    status,
    createdBy: req.user._id,
  });

  // Generate EMIs
  const emis = [];
  let currentEmiDate = new Date(loan.emiStartDate || loan.loanStartDate);

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
    currentEmiDate.setMonth(currentEmiDate.getMonth() + 1);
  }

  await EMI.insertMany(emis);

  sendResponse(
    res,
    201,
    "success",
    "Customer, Loan and EMIs created successfully",
    null,
    {
      loan: formatLoanResponse(loan),
      emis,
    },
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
    customers,
  );
});

const getCustomerByLoanNumber = asyncHandler(async (req, res, next) => {
  const customer = await Loan.findOne({ loanNumber: req.params.loanNumber });
  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  const emis = await EMI.find({ loanId: customer._id }).sort({ emiNumber: 1 });

  sendResponse(res, 200, "success", "Customer found", null, {
    customer: formatLoanResponse(customer),
    emis,
  });
});

const updateCustomer = asyncHandler(async (req, res, next) => {
  if (
    !mongoose.Types.ObjectId.isValid(req.params.id) ||
    req.params.id === "undefined"
  ) {
    return next(new ErrorHandler("Invalid Customer ID provided", 400));
  }
  let loan = await Loan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan record not found", 404));
  }

  loan = await Loan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  sendResponse(
    res,
    200,
    "success",
    "Customer updated successfully",
    null,
    formatLoanResponse(loan),
  );
});

const updateEMI = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    amountPaid,
    addedAmount,
    paymentMode,
    paymentDate,
    overdue,
    remarks,
    dateGroups,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || id === "undefined") {
    return next(new ErrorHandler("Invalid EMI ID provided", 400));
  }

  let emi = await EMI.findById(id);
  if (!emi) {
    return next(new ErrorHandler("EMI record not found", 404));
  }

  // Process payments from dateGroups if provided (replaces existing history)
  if (dateGroups && Array.isArray(dateGroups)) {
    emi.paymentHistory = []; // Clear current history to replace with updated state from modal
    dateGroups.forEach((group) => {
      if (group.date && group.payments) {
        group.payments.forEach((p) => {
          const amount = parseFloat(p.amount);
          if (amount > 0 && p.mode) {
            emi.paymentHistory.push({
              amount: amount,
              mode: p.mode,
              date: new Date(group.date),
            });
          }
        });
      }
    });
  }

  // Recalculate amountPaid and paymentMode from full history
  const totalPaidFromHistory = emi.paymentHistory.reduce(
    (acc, curr) => acc + curr.amount,
    0,
  );
  const modesFromHistory = [
    ...new Set(emi.paymentHistory.map((p) => p.mode).filter(Boolean)),
  ].join(", ");

  // Final values
  newAmountPaid = totalPaidFromHistory;
  const totalEmiAmount = parseFloat(emi.emiAmount);

  if (newAmountPaid >= totalEmiAmount) {
    newStatus = "Paid";
  } else if (newAmountPaid > 0) {
    newStatus = "Partially Paid";
  } else {
    newStatus = "Pending";
  }

  emi = await EMI.findByIdAndUpdate(
    id,
    {
      amountPaid: newAmountPaid,
      paymentMode: modesFromHistory || emi.paymentMode,
      paymentDate:
        paymentDate ||
        emi.paymentDate ||
        (emi.paymentHistory.length > 0
          ? emi.paymentHistory[emi.paymentHistory.length - 1].date
          : null),
      overdue: overdue !== undefined ? overdue : emi.overdue,
      status: newStatus,
      remarks: remarks || emi.remarks,
      paymentHistory: emi.paymentHistory,
      updatedBy: req.user._id,
    },
    { new: true, runValidators: true },
  ).populate("updatedBy", "name");

  sendResponse(res, 200, "success", "EMI updated successfully", null, emi);
});

const getAllEMIDetails = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const total = await EMI.countDocuments();

  const emis = await EMI.aggregate([
    { $sort: { updatedAt: -1 } },
    { $skip: skip },
    { $limit: limit },
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
        loanId: 1,
        loanNumber: 1,
        customerName: 1,
        emiNumber: 1,
        dueDate: 1,
        emiAmount: 1,
        amountPaid: 1,
        paymentDate: 1,
        paymentMode: 1,
        overdue: 1,
        status: 1,
        remarks: 1,
        updatedAt: 1,
        guarantorMobileNumbers: "$loan.guarantorMobileNumbers",
        guarantorName: "$loan.guarantorName",
        updatedBy: 1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "updatedBy",
        foreignField: "_id",
        as: "updatedBy",
      },
    },
    {
      $unwind: {
        path: "$updatedBy",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        updatedBy: { $ifNull: ["$updatedBy.name", null] },
        _id: 1,
        loanId: 1,
        loanNumber: 1,
        customerName: 1,
        emiNumber: 1,
        dueDate: 1,
        emiAmount: 1,
        amountPaid: 1,
        paymentDate: 1,
        paymentMode: 1,
        overdue: 1,
        status: 1,
        remarks: 1,
        updatedAt: 1,
        mobileNumbers: 1,
        guarantorMobileNumbers: 1,
        guarantorName: 1,
      },
    },
  ]);

  sendResponse(res, 200, "success", "EMI details fetched successfully", null, {
    emis,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

const getEMIsByLoanId = asyncHandler(async (req, res, next) => {
  const { loanId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(loanId) || loanId === "undefined") {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }
  const emis = await EMI.find({ loanId })
    .sort({
      emiNumber: 1,
    })
    .populate("updatedBy", "name");
  sendResponse(res, 200, "success", "EMIs fetched successfully", null, emis);
});

module.exports = {
  createCustomerLoan,
  getAllCustomers,
  getCustomerByLoanNumber,
  updateCustomer,
  updateEMI,
  getAllEMIDetails,
  getEMIsByLoanId,
};

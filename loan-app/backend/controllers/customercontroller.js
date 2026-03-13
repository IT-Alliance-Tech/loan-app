const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const EMI = require("../models/EMI");
const Payment = require("../models/Payment");
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
          if (amount > 0) {
            emi.paymentHistory.push({
              amount: amount,
              mode: p.mode || "CASH",
              date: new Date(group.date),
            });
          }
        });
      }
    });
  } else if (addedAmount && parseFloat(addedAmount) > 0) {
    // Fallback/Legacy support: Add a single payment if dateGroups is missing but addedAmount is present
    emi.paymentHistory.push({
      amount: parseFloat(addedAmount),
      mode: paymentMode || "CASH",
      date: paymentDate ? new Date(paymentDate) : new Date(),
    });
  }

  // CREATE PAYMENT RECORDS FOR NEW PAYMENTS
  if (dateGroups && Array.isArray(dateGroups)) {
    // Delete existing payment records for this EMI to sync with the new history
    await Payment.deleteMany({ emiId: emi._id });

    const paymentRecords = [];
    dateGroups.forEach((group) => {
      if (group.date && group.payments) {
        group.payments.forEach((p) => {
          const amount = parseFloat(p.amount);
          if (amount > 0) {
            paymentRecords.push({
              emiId: emi._id,
              loanId: emi.loanId,
              loanModel: emi.loanModel,
              amount: amount,
              mode: p.mode || "CASH",
              paymentDate: new Date(group.date),
              paymentType:
                emi.loanModel === "DailyLoan"
                  ? "Daily"
                  : emi.loanModel === "WeeklyLoan"
                    ? "Weekly"
                    : "Monthly",
              status: "Success",
              collectedBy: req.user._id,
            });
          }
        });
      }
    });

    // Add overdue/penalty as a payment record if it exists
    if (overdue && parseFloat(overdue) > 0) {
      paymentRecords.push({
        emiId: emi._id,
        loanId: emi.loanId,
        loanModel: emi.loanModel,
        amount: parseFloat(overdue),
        mode: paymentMode || "CASH",
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentType:
          emi.loanModel === "DailyLoan"
            ? "Daily"
            : emi.loanModel === "WeeklyLoan"
              ? "Weekly"
              : "Monthly",
        status: "Success",
        remarks: "Overdue/Penalty Payment",
        collectedBy: req.user._id,
      });
    }

    if (paymentRecords.length > 0) {
      await Payment.insertMany(paymentRecords);
    }
  } else {
    // Handle single payment updates (standard adding logic)
    if (addedAmount && parseFloat(addedAmount) > 0) {
      await Payment.create({
        emiId: emi._id,
        loanId: emi.loanId,
        loanModel: emi.loanModel,
        amount: parseFloat(addedAmount),
        mode: paymentMode || "CASH",
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentType:
          emi.loanModel === "DailyLoan"
            ? "Daily"
            : emi.loanModel === "WeeklyLoan"
              ? "Weekly"
              : "Monthly",
        status: "Success",
        collectedBy: req.user._id,
      });
    }

    // Add overdue/penalty as a separate record if it exists and wasn't part of dateGroups
    if (overdue && parseFloat(overdue) > 0) {
      // Check if a penalty payment already exists to avoid duplication if not using dateGroups
      // For simplicity, we create it here if it's a direct overdue update
      await Payment.create({
        emiId: emi._id,
        loanId: emi.loanId,
        loanModel: emi.loanModel,
        amount: parseFloat(overdue),
        mode: paymentMode || "CASH",
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentType:
          emi.loanModel === "DailyLoan"
            ? "Daily"
            : emi.loanModel === "WeeklyLoan"
              ? "Weekly"
              : "Monthly",
        status: "Success",
        remarks: "Overdue/Penalty Payment",
        collectedBy: req.user._id,
      });
    }
  }

  // Recalculate amountPaid and paymentMode from full history
  const totalPaidFromHistory = emi.paymentHistory.reduce(
    (acc, curr) => acc + curr.amount,
    0,
  );
  // Final values
  const newAmountPaid = totalPaidFromHistory;
  const totalEmiAmount = parseFloat(emi.emiAmount);
  const modesFromHistory = [...new Set(emi.paymentHistory.map((p) => p.mode))]
    .filter(Boolean)
    .join(", ");
  let newStatus;

  if (newAmountPaid >= totalEmiAmount) {
    newStatus = "Paid";
  } else if (newAmountPaid > 0) {
    newStatus = "Partially Paid";
  } else {
    // Only set to Pending if it's currently NOT Overdue or if we want to reset it
    newStatus = overdue > 0 ? "Overdue" : "Pending";
  }

  // Update properties on the document directly
  emi.amountPaid = newAmountPaid;
  emi.paymentMode = modesFromHistory || emi.paymentMode || "CASH";
  emi.paymentDate =
    paymentDate ||
    (emi.paymentHistory.length > 0
      ? emi.paymentHistory[emi.paymentHistory.length - 1].date
      : emi.paymentDate);
  emi.overdue = overdue !== undefined ? overdue : emi.overdue;
  emi.status = newStatus;
  emi.remarks = remarks || emi.remarks;
  emi.updatedBy = req.user._id;

  // Use save() instead of findByIdAndUpdate for reliability with Mongoose arrays
  await emi.save();
  await emi.populate("updatedBy", "name");

  // Sync with WeeklyLoan if applicable
  if (emi.loanModel === "WeeklyLoan") {
    try {
      const WeeklyLoan = require("../models/WeeklyLoan");
      const allEmis = await EMI.find({
        loanId: emi.loanId,
        loanModel: "WeeklyLoan",
      });
      const paidEmisCount = allEmis.filter((e) => e.status === "Paid").length;

      const weeklyLoan = await WeeklyLoan.findById(emi.loanId);
      if (weeklyLoan) {
        weeklyLoan.paidEmis = paidEmisCount;
        await weeklyLoan.save();
      }
    } catch (err) {
      console.error("Error syncing WeeklyLoan EMIs:", err);
    }
  }

  // Sync with DailyLoan if applicable
  if (emi.loanModel === "DailyLoan") {
    try {
      const DailyLoan = require("../models/DailyLoan");
      const allEmis = await EMI.find({
        loanId: emi.loanId,
        loanModel: "DailyLoan",
      });
      const paidEmisCount = allEmis.filter((e) => e.status === "Paid").length;

      const dailyLoan = await DailyLoan.findById(emi.loanId);
      if (dailyLoan) {
        dailyLoan.paidEmis = paidEmisCount;
        await dailyLoan.save();
      }
    } catch (err) {
      console.error("Error syncing DailyLoan EMIs:", err);
    }
  }

  // Sync with main Loan if applicable
  if (emi.loanModel === "Loan" || !emi.loanModel) {
    try {
      const Loan = require("../models/Loan");
      const allEmis = await EMI.find({
        loanId: emi.loanId,
        loanModel: "Loan",
      });

      const isAllPaid = allEmis.every((e) => e.status === "Paid");
      const isAnyPaid = allEmis.some(
        (e) => e.status === "Paid" || e.status === "Partially Paid",
      );

      const loan = await Loan.findById(emi.loanId);
      if (loan) {
        if (isAllPaid) {
          loan.paymentStatus = "Paid";
        } else if (isAnyPaid) {
          loan.paymentStatus = "Partially Paid";
        } else {
          loan.paymentStatus = "Pending";
        }
        await loan.save();
      }
    } catch (err) {
      console.error("Error syncing main Loan EMIs:", err);
    }
  }

  sendResponse(res, 200, "success", "EMI updated successfully", null, emi);
});

const getAllEMIDetails = asyncHandler(async (req, res, next) => {
  const { loanNumber, customerName, status, mobileNumber, vehicleNumber } =
    req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (status) query.status = { $regex: new RegExp(`^${status}$`, "i") };

  // For mobile and vehicle, we MUST find matching loanIds first because these fields
  // do not exist on the EMI model itself.
  if (mobileNumber || vehicleNumber) {
    const loanFilter = {};
    if (mobileNumber) {
      loanFilter.$or = [
        { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
        { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
      ];
    }
    if (vehicleNumber) {
      loanFilter.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
    }

    const matchingLoans = await Loan.find(loanFilter).select("_id");
    const matchingLoanIds = matchingLoans.map((l) => l._id);

    if (matchingLoanIds.length === 0) {
      // If no loans match the mobile/vehicle filter, ensure no EMIs are found
      // We use a non-existent ID to force an empty result
      query.loanId = new mongoose.Types.ObjectId();
    } else {
      query.loanId = { $in: matchingLoanIds };
    }
  }

  const total = await EMI.countDocuments(query);

  const emis = await EMI.aggregate([
    { $match: query },
    { $sort: { updatedAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "payments",
        localField: "_id",
        foreignField: "emiId",
        as: "paymentRecords",
      },
    },
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
        mobileNumbers: "$loan.mobileNumbers",
        guarantorMobileNumbers: "$loan.guarantorMobileNumbers",
        guarantorName: "$loan.guarantorName",
        updatedBy: 1,
        paymentRecords: 1,
        paymentHistory: 1,
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
        paymentRecords: 1,
        paymentHistory: 1,
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
    .populate("updatedBy", "name")
    .populate("paymentRecords");
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

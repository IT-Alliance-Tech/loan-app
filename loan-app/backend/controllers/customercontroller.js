const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const EMI = require("../models/EMI");
const Payment = require("../models/Payment");
const ErrorHandler = require("../utils/ErrorHandler");
const { formatLoanResponse } = require("../utils/loanFormatter");
const asyncHandler = require("../utils/asyncHandler");
const { parseDateInLocalFormat, normalizeToMidnight } = require('../utils/dateUtils');
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
      overdue: [],
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

  // CALCULATE DELTAS FOR IMMUTABLE TRANSACTION RECORDING
  const oldEmiSum = parseFloat(emi.amountPaid) || 0;
  const overdueArray = Array.isArray(emi.overdue) ? emi.overdue : [];
  const oldOverdueSum = overdueArray.reduce((acc, ov) => acc + (parseFloat(ov.amount) || 0), 0);

  // Update properties on the document directly (before bucket logic)
  if (overdue !== undefined) emi.overdue = overdue;
  if (remarks !== undefined) emi.remarks = remarks;

  // Process payments from dateGroups if provided
  if (dateGroups && Array.isArray(dateGroups)) {
    emi.paymentHistory = [];
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
    emi.paymentHistory.push({
      amount: parseFloat(addedAmount),
      mode: paymentMode || "CASH",
      date: normalizeToMidnight(parseDateInLocalFormat(paymentDate || new Date())),
    });
  }

  // --- GRANULAR MULTI-TRANSACTION LOGIC ---
  const newEmiSum = emi.paymentHistory.reduce((acc, curr) => acc + curr.amount, 0);
  const currentOverdueArray = Array.isArray(overdue) ? overdue : [];
  const newOverdueSum = currentOverdueArray.reduce((acc, ov) => acc + (parseFloat(ov.amount) || 0), 0);

  // 1. Group Old/New by Date Only (to merge different modes in one row per date)
  const getGroupKey = (date) => {
    const d = normalizeToMidnight(new Date(date));
    return d.toISOString();
  };

  // We need the original EMI to get OLD payments/overdue
  // BUT emi is already modified in memory. Let's get the original values we stored.
  // Wait, I need the original objects to compare. I'll use a snapshot.
  
  // NOTE: I already have oldEmiSum and oldOverdueSum. 
  // To be precise about "every transaction", we compare the arrays.
  const changes = []; // Array of { date, mode, emiDelta, overdueDelta }

  // Strategy: Group everything by (date, mode) and calculate deltas for each bucket.
  const buckets = {};
  const addToBucket = (date, mode, type, amount, isNew) => {
    const key = getGroupKey(date);
    if (!buckets[key]) {
      buckets[key] = {
        date: normalizeToMidnight(new Date(date)),
        modes: new Set(),
        emiDelta: 0,
        overdueDelta: 0,
      };
    }
    const val = parseFloat(amount) || 0;
    if (type === "EMI") buckets[key].emiDelta += isNew ? val : -val;
    else buckets[key].overdueDelta += isNew ? val : -val;

    if (isNew && val > 0 && mode) {
      buckets[key].modes.add(mode.toUpperCase());
    }
  };

  // Process Old state (subtract from buckets)
  // We need the original lists. I'll fetch the original EMI data once more or use the emi object before save.
  // Actually, I can just use the memory emi object since I modified it, but I need what it WAS.
  
  // Let's re-fetch the original to be 100% accurate for deltas
  const originalEmi = await EMI.findById(id).lean();
  
  if (Array.isArray(originalEmi.paymentHistory)) {
    originalEmi.paymentHistory.forEach(p => addToBucket(p.date, p.mode, 'EMI', p.amount, false));
  }
  
  if (Array.isArray(originalEmi.overdue)) {
    originalEmi.overdue.forEach(p => addToBucket(p.date, p.mode, 'Overdue', p.amount, false));
  }

  // Process New state (add to buckets)
  if (Array.isArray(emi.paymentHistory)) {
    emi.paymentHistory.forEach(p => addToBucket(p.date, p.mode, 'EMI', p.amount, true));
  }
  
  if (Array.isArray(emi.overdue)) {
    emi.overdue.forEach(p => addToBucket(p.date, p.mode, 'Overdue', p.amount, true));
  }

  // Create Payment records for each bucket with a non-zero delta
  for (const key in buckets) {
    const { date, modes, emiDelta, overdueDelta } = buckets[key];
    const totalDelta = emiDelta + overdueDelta;

    if (totalDelta !== 0 || emiDelta !== 0 || overdueDelta !== 0) {
      const combinedMode = modes.size > 0 ? Array.from(modes).join(", ") : "CASH";
      await Payment.create({
        emiId: emi._id,
        loanId: emi.loanId,
        loanModel: emi.loanModel,
        emiAmount: emiDelta,
        overdueAmount: overdueDelta,
        totalAmount: totalDelta,
        amount: totalDelta, // Legacy fallback
        mode: combinedMode,
        paymentDate: date,
        paymentType:
          emi.loanModel === "DailyLoan"
            ? "Daily"
            : emi.loanModel === "WeeklyLoan"
              ? "Weekly"
              : "Monthly",
        status: "Success",
        collectedBy: req.user._id,
        remarks: remarks || "",
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
    // Check if there are any overdue entries
    const hasOverdue = overdue && Array.isArray(overdue) && overdue.some(ov => parseFloat(ov.amount) > 0);
    newStatus = hasOverdue ? "Overdue" : "Pending";
  }

  // Update properties on the document indirectly (final sync)
  emi.amountPaid = newAmountPaid;
  emi.paymentMode = modesFromHistory || emi.paymentMode || "CASH";
  emi.paymentDate =
    paymentDate ||
    (emi.paymentHistory.length > 0
      ? emi.paymentHistory[emi.paymentHistory.length - 1].date
      : emi.paymentDate);
  emi.status = newStatus;
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
      const isAllPaid = allEmis.length > 0 && allEmis.every((e) => e.status === "Paid");

      const weeklyLoan = await WeeklyLoan.findById(emi.loanId);
      if (weeklyLoan) {
        weeklyLoan.paidEmis = paidEmisCount;
        
        // Update odAmount
        const totalOdAmount = allEmis.reduce((acc, currentEmi) => {
          if (Array.isArray(currentEmi.overdue)) {
            return acc + currentEmi.overdue.reduce((oAcc, ov) => oAcc + (parseFloat(ov.amount) || 0), 0);
          }
          return acc + (parseFloat(currentEmi.overdue) || 0);
        }, 0);
        weeklyLoan.odAmount = totalOdAmount;

        if (isAllPaid) {
          weeklyLoan.status = "Closed";
        } else if (weeklyLoan.status === "Closed") {
          weeklyLoan.status = "Active";
        }
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
      const isAllPaid = allEmis.length > 0 && allEmis.every((e) => e.status === "Paid");

      const dailyLoan = await DailyLoan.findById(emi.loanId);
      if (dailyLoan) {
        dailyLoan.paidEmis = paidEmisCount;

        // Update odAmount
        const totalOdAmount = allEmis.reduce((acc, currentEmi) => {
          if (Array.isArray(currentEmi.overdue)) {
            return acc + currentEmi.overdue.reduce((oAcc, ov) => oAcc + (parseFloat(ov.amount) || 0), 0);
          }
          return acc + (parseFloat(currentEmi.overdue) || 0);
        }, 0);
        dailyLoan.odAmount = totalOdAmount;

        if (isAllPaid) {
          dailyLoan.status = "Closed";
        } else if (dailyLoan.status === "Closed") {
          dailyLoan.status = "Active";
        }
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

      const isAllPaid = allEmis.length > 0 && allEmis.every((e) => e.status === "Paid");
      const isAnyPaid = allEmis.some(
        (e) => e.status === "Paid" || e.status === "Partially Paid",
      );

      const loan = await Loan.findById(emi.loanId);
      if (loan) {
        if (isAllPaid) {
          loan.paymentStatus = "Paid";
          loan.status = "Closed";
        } else if (isAnyPaid) {
          loan.paymentStatus = "Partially Paid";
          if (loan.status === "Closed") {
            loan.status = "Active";
          }
        } else {
          loan.paymentStatus = "Pending";
          if (loan.status === "Closed") {
            loan.status = "Active";
          }
        }
        // Update odAmount
        const totalOdAmount = allEmis.reduce((acc, currentEmi) => {
          if (Array.isArray(currentEmi.overdue)) {
            return acc + currentEmi.overdue.reduce((oAcc, ov) => oAcc + (parseFloat(ov.amount) || 0), 0);
          }
          return acc + (parseFloat(currentEmi.overdue) || 0);
        }, 0);
        loan.odAmount = totalOdAmount;

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

const mongoose = require("mongoose");
const InterestLoan = require("../models/InterestLoan");
const InterestEMI = require("../models/InterestEMI");
const Payment = require("../models/Payment");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { addMonths, differenceInCalendarMonths } = require("date-fns");
const {
  parseDateInLocalFormat,
  normalizeToMidnight,
} = require("../utils/dateUtils");

// Create Interest Loan
exports.createInterestLoan = asyncHandler(async (req, res, next) => {
  const {
    loanNumber,
    customerName,
    address,
    ownRent,
    mobileNumbers,
    panNumber,
    aadharNumber,
    guarantorName,
    guarantorMobileNumbers,
    principalAmount,
    interestRate,
    processingFeeRate,
    processingFee,
    startDate,
    emiStartDate,
    disbursement,
    principalPayments,
    paymentMode,
    remarks,
  } = req.body;

  if (!loanNumber) {
    return next(new ErrorHandler("Loan number is required", 400));
  }

  const existingLoan = await InterestLoan.findOne({ loanNumber });
  if (existingLoan) {
    return next(new ErrorHandler("Loan number already exists", 400));
  }

  const initialP = (disbursement || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) || parseFloat(principalAmount) || 0;
  const paidP = (principalPayments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const remainingP = initialP - paidP;
  const r = parseFloat(interestRate) || 0;
  const fee = parseFloat(processingFee) || 0;

  const interestLoan = await InterestLoan.create({
    loanNumber,
    customerName,
    address,
    ownRent,
    mobileNumbers,
    panNumber,
    aadharNumber,
    guarantorName,
    guarantorMobileNumbers,
    initialPrincipalAmount: initialP,
    remainingPrincipalAmount: remainingP,
    interestRate: r,
    processingFeeRate: parseFloat(processingFeeRate) || 0,
    processingFee: fee,
    startDate: startDate || new Date(),
    emiStartDate: emiStartDate || new Date(),
    disbursement: disbursement || [],
    principalPayments: principalPayments || [],
    createdBy: req.user._id,
    paymentMode: paymentMode || "Cash",
    status: remainingP <= 0 ? "Closed" : (req.body.status || "Active"),
    remarks,
  });

  // Generate EMIs from emiStartDate until today (Catch-up loop)
  const today = normalizeToMidnight(new Date());
  let currentEmiDate = normalizeToMidnight(new Date(interestLoan.emiStartDate));
  let emiNum = 1;

  while (emiNum === 1 || currentEmiDate <= today) {
    const emiInterestAmount = Math.ceil(interestLoan.initialPrincipalAmount * (r / 100));
    const isFirst = emiNum === 1;

    const emi = await InterestEMI.create({
      interestLoanId: interestLoan._id,
      loanNumber: interestLoan.loanNumber,
      customerName: interestLoan.customerName,
      emiNumber: emiNum,
      dueDate: new Date(currentEmiDate),
      interestAmount: emiInterestAmount,
      amountPaid: isFirst ? emiInterestAmount : 0,
      status: isFirst ? "Paid" : "Pending",
      paymentDate: isFirst ? new Date(interestLoan.startDate) : null,
      paymentMode: isFirst ? (paymentMode || "Cash") : "",
      remarks: isFirst ? "Auto-paid First EMI" : "",
      paymentHistory: isFirst
        ? [
            {
              amount: emiInterestAmount,
              mode: paymentMode || "Cash",
              date: new Date(interestLoan.startDate),
              addedBy: req.user._id,
            },
          ]
        : [],
      updatedBy: isFirst ? req.user._id : undefined,
    });

    if (isFirst) {
      // Create Payment record for auto-paid first EMI
      await Payment.create({
        emiId: emi._id,
        loanId: interestLoan._id,
        loanModel: "InterestLoan",
        amount: emiInterestAmount,
        mode: paymentMode || "Cash",
        paymentDate: new Date(interestLoan.startDate),
        paymentType: "Interest",
        status: "Success",
        remarks: "Auto-paid First EMI",
        collectedBy: req.user._id,
      });
    }

    emiNum++;
    currentEmiDate = addMonths(currentEmiDate, 1);
    if (emiNum > 120) break; // Safety break
  }

  // Create Payment record for processing fee if applicable
  if (fee > 0) {
    await Payment.create({
      loanId: interestLoan._id,
      loanModel: "InterestLoan",
      amount: fee,
      mode: "Cash",
      paymentDate: interestLoan.startDate || new Date(),
      paymentType: "Processing Fee",
      status: "Success",
      remarks: "Interest Loan Processing Fee",
      collectedBy: req.user._id,
    });
  }

  sendResponse(res, 201, "success", "Interest loan created successfully", null, interestLoan);
});

// Get All Interest Loans
exports.getAllInterestLoans = asyncHandler(async (req, res, next) => {
  const { searchQuery, status, page = 1, limit = 25 } = req.query;
  const query = {};

  if (status && status !== "undefined" && status !== "null") {
    query.status = status;
  }
  
  if (searchQuery && searchQuery !== "undefined" && searchQuery !== "null") {
    query.$or = [
      { loanNumber: { $regex: searchQuery, $options: "i" } },
      { customerName: { $regex: searchQuery, $options: "i" } },
      { mobileNumbers: { $regex: searchQuery, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const total = await InterestLoan.countDocuments(query);
  const loans = await InterestLoan.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  sendResponse(res, 200, "success", "Interest loans fetched successfully", null, {
    loans,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Get Interest Loan Details
exports.getInterestLoanById = asyncHandler(async (req, res, next) => {
  const loan = await InterestLoan.findById(req.params.id)
    .populate("createdBy", "name")
    .populate("updatedBy", "name");

  if (!loan) {
    return next(new ErrorHandler("Interest loan not found", 404));
  }

  let emis = await InterestEMI.find({ interestLoanId: loan._id })
    .populate("updatedBy", "name")
    .sort({
      emiNumber: 1,
    });

  // Self-healing: Ensure at least one pending or paid EMI exists, and if the last one is paid, generate the next one
  if (loan.status && loan.status.toLowerCase() === "active") {
    if (emis.length === 0) {
      const firstAmount = Math.ceil(
        loan.initialPrincipalAmount * (loan.interestRate / 100)
      );
      const newEmi = await InterestEMI.create({
        interestLoanId: loan._id,
        loanNumber: loan.loanNumber,
        customerName: loan.customerName,
        emiNumber: 1,
        dueDate: new Date(loan.emiStartDate),
        interestAmount: firstAmount,
        status: "Pending",
      });
      emis = [newEmi];
    } else {
      let lastEmi = emis[emis.length - 1];
      const today = normalizeToMidnight(new Date());

      // Catch up with missing EMIs if the last one is paid and we're not yet in the future
      while (
        lastEmi.status === "Paid" &&
        normalizeToMidnight(new Date(lastEmi.dueDate)) <= today
      ) {
        const nextDueDate = addMonths(new Date(lastEmi.dueDate), 1);
        const nextInterestAmount = Math.ceil(
          loan.remainingPrincipalAmount * (loan.interestRate / 100)
        );

        const newEmi = await InterestEMI.create({
          interestLoanId: loan._id,
          loanNumber: loan.loanNumber,
          customerName: loan.customerName,
          emiNumber: lastEmi.emiNumber + 1,
          dueDate: nextDueDate,
          interestAmount: nextInterestAmount,
          status: "Pending",
        });
        emis.push(newEmi);
        lastEmi = newEmi;

        if (lastEmi.emiNumber > 500) break; // Safety break
      }
    }
  }

  sendResponse(res, 200, "success", "Interest loan fetched successfully", null, {
    loan,
    emis,
  });
});

// Add Principal Payment
exports.addPrincipalPayment = asyncHandler(async (req, res, next) => {
  const { amount, paymentMode, paymentDate, remarks } = req.body;
  const loan = await InterestLoan.findById(req.params.id);

  if (!loan) {
    return next(new ErrorHandler("Interest loan not found", 404));
  }

  const pAmount = parseFloat(amount);
  if (isNaN(pAmount) || pAmount <= 0) {
    return next(new ErrorHandler("Invalid payment amount", 400));
  }

  loan.principalPayments.push({
    amount: pAmount,
    paymentMode: paymentMode || "Cash",
    paymentDate: paymentDate || new Date(),
    remarks,
    addedBy: req.user._id,
  });

  loan.remainingPrincipalAmount -= pAmount;
  if (loan.remainingPrincipalAmount <= 0) {
    loan.status = "Closed";
    loan.remainingPrincipalAmount = 0;
  }

  await loan.save();

  // Note: Future interest EMIs will be generated based on this new remainingPrincipalAmount.
  // Existing "Pending" EMIs are not automatically adjusted unless business logic requires it.
  // We'll stick to the "next month" generation logic.

  sendResponse(res, 200, "success", "Principal payment added successfully", null, loan);
});

// Update/Pay Interest EMI
const normalizePaymentMode = (mode) => {
  if (!mode) return "Cash";
  const m = mode.trim().toLowerCase();
  if (m === "cash") return "Cash";
  if (m === "online") return "Online";
  if (m === "cheque") return "Cheque";
  // Return Title Case for other strings just in case
  return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
};

exports.payInterestEMI = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { remarks, dateGroups } = req.body;
  let { overdue } = req.body;

  // Normalize overdue modes
  if (Array.isArray(overdue)) {
    overdue = overdue.map(ov => ({
      ...ov,
      mode: normalizePaymentMode(ov.mode)
    }));
  }

  if (!mongoose.Types.ObjectId.isValid(id) || id === "undefined") {
    return next(new ErrorHandler("Invalid EMI ID provided", 400));
  }

  let emi = await InterestEMI.findById(id);
  if (!emi) {
    return next(new ErrorHandler("Interest EMI record not found", 404));
  }

  const loan = await InterestLoan.findById(emi.interestLoanId);
  if (!loan) {
    return next(new ErrorHandler("Interest loan not found", 404));
  }

  // --- DELTA CALCULATIONS FOR TRANSACTIONS ---
  const originalEmi = await InterestEMI.findById(id).lean();
  const buckets = {};
  const getGroupKey = (date) =>
    normalizeToMidnight(new Date(date)).toISOString();

  const addToBucket = (date, mode, chequeNumber, type, amount, isNew) => {
    const key = getGroupKey(date);
    if (!buckets[key]) {
      buckets[key] = {
        date: normalizeToMidnight(new Date(date)),
        modes: new Set(),
        chequeNumbers: new Set(),
        emiDelta: 0,
        overdueDelta: 0,
      };
    }
    const val = parseFloat(amount) || 0;
    if (type === "EMI") buckets[key].emiDelta += isNew ? val : -val;
    else buckets[key].overdueDelta += isNew ? val : -val;

    if (isNew && val > 0) {
      if (mode) buckets[key].modes.add(normalizePaymentMode(mode));
      if (chequeNumber) buckets[key].chequeNumbers.add(chequeNumber);
    }
  };

  // Process history from dateGroups if provided
  if (dateGroups && Array.isArray(dateGroups)) {
    emi.paymentHistory = [];
    dateGroups.forEach((group) => {
      if (group.date && group.payments) {
        group.payments.forEach((p) => {
          const amount = parseFloat(p.amount);
          if (amount > 0) {
            const normalizedMode = normalizePaymentMode(p.mode);
            emi.paymentHistory.push({
              amount: amount,
              mode: normalizedMode,
              chequeNumber: p.chequeNumber || "",
              date: new Date(group.date),
              addedBy: req.user._id,
            });
            addToBucket(group.date, normalizedMode, p.chequeNumber, "EMI", amount, true);
          }
        });
      }
    });
  }

  // Update properties on the document directly
  if (overdue !== undefined) emi.overdue = overdue;
  if (remarks !== undefined) emi.remarks = remarks;

  // Process Old vs New state for buckets to create transaction records
  if (Array.isArray(originalEmi.paymentHistory)) {
    originalEmi.paymentHistory.forEach((p) =>
      addToBucket(p.date, p.mode, p.chequeNumber, "EMI", p.amount, false)
    );
  }
  if (Array.isArray(originalEmi.overdue)) {
    originalEmi.overdue.forEach((p) =>
      addToBucket(p.date, p.mode, p.chequeNumber, "Overdue", p.amount, false)
    );
  }

  if (Array.isArray(emi.paymentHistory)) {
    emi.paymentHistory.forEach((p) =>
      addToBucket(p.date, p.mode, p.chequeNumber, "EMI", p.amount, true)
    );
  }
  if (Array.isArray(emi.overdue)) {
    emi.overdue.forEach((p) =>
      addToBucket(p.date, p.mode, p.chequeNumber, "Overdue", p.amount, true)
    );
  }

  // Create Payment Records for each bucket with a non-zero delta
  for (const key in buckets) {
    const { date, modes, chequeNumbers, emiDelta, overdueDelta } = buckets[key];
    const totalDelta = emiDelta + overdueDelta;

    if (totalDelta !== 0 || emiDelta !== 0 || overdueDelta !== 0) {
      const combinedMode =
        modes.size > 0 ? Array.from(modes).join(", ") : "Cash";
      const combinedChequeNo =
        chequeNumbers.size > 0 ? Array.from(chequeNumbers).join(", ") : "";

      await Payment.create({
        emiId: emi._id,
        loanId: emi.interestLoanId,
        loanModel: "InterestLoan",
        amount: totalDelta,
        mode: combinedMode,
        chequeNumber: combinedChequeNo,
        paymentDate: date,
        paymentType: "Interest",
        status: "Success",
        remarks: remarks || "",
        collectedBy: req.user._id,
      });
    }
  }

  // Recalculate amountPaid and status
  const newAmountPaid = emi.paymentHistory.reduce(
    (acc, curr) => acc + curr.amount,
    0
  );
  emi.amountPaid = newAmountPaid;

  const oldStatus = originalEmi.status;
  if (emi.amountPaid >= emi.interestAmount) {
    emi.status = "Paid";
    emi.paymentDate =
      emi.paymentHistory.length > 0
        ? emi.paymentHistory[emi.paymentHistory.length - 1].date
        : new Date();
  } else if (emi.amountPaid > 0) {
    emi.status = "Partially Paid";
  } else {
    const hasOverdue =
      emi.overdue &&
      Array.isArray(emi.overdue) &&
      emi.overdue.some((ov) => parseFloat(ov.amount) > 0);
    emi.status = hasOverdue ? "Overdue" : "Pending";
  }

  emi.updatedBy = req.user._id;

  // Sync paymentMode from history
  if (Array.isArray(emi.paymentHistory)) {
    emi.paymentMode = [
      ...new Set(emi.paymentHistory.map((p) => p.mode).filter(Boolean)),
    ].join(", ");
  }

  await emi.save();

  // NEXT month logic: Open next month's EMI if the current one just became "Paid"
  if (emi.status === "Paid" && oldStatus !== "Paid") {
    const nextEmi = await InterestEMI.findOne({
      interestLoanId: loan._id,
      emiNumber: emi.emiNumber + 1,
    });

    if (!nextEmi && loan.status && loan.status.toLowerCase() === "active") {
      const nextDueDate = addMonths(new Date(emi.dueDate), 1);
      const nextInterestAmount = Math.ceil(
        loan.remainingPrincipalAmount * (loan.interestRate / 100)
      );

      await InterestEMI.create({
        interestLoanId: loan._id,
        loanNumber: loan.loanNumber,
        customerName: loan.customerName,
        emiNumber: emi.emiNumber + 1,
        dueDate: nextDueDate,
        interestAmount: nextInterestAmount,
        status: "Pending",
      });
    }
  }

  sendResponse(
    res,
    200,
    "success",
    "Interest EMI updated successfully",
    null,
    emi
  );
});

// Get Pending Interest Payments
exports.getInterestPendingPayments = asyncHandler(async (req, res, next) => {
  const { searchQuery, page = 1, limit = 25 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const now = new Date();
  const query = {
    status: { $ne: "Paid" },
    dueDate: { $lte: now }
  };

  if (searchQuery && searchQuery !== "undefined" && searchQuery !== "null") {
    query.$or = [
      { loanNumber: { $regex: searchQuery, $options: "i" } },
      { customerName: { $regex: searchQuery, $options: "i" } },
    ];
  }

  const total = await InterestEMI.countDocuments(query);
  const pendingPayments = await InterestEMI.find(query)
    .populate({
      path: "interestLoanId",
      select: "mobileNumbers remainingPrincipalAmount"
    })
    .sort({ dueDate: 1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  sendResponse(res, 200, "success", "Pending interest payments fetched", null, {
    pendingPayments,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    }
  });
});

// Update Loan basic details
exports.updateInterestLoan = asyncHandler(async (req, res, next) => {
  let loan = await InterestLoan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  const oldEmiStartDate = loan.emiStartDate
    ? new Date(loan.emiStartDate).toISOString().split("T")[0]
    : null;
  const newEmiStartDate = req.body.emiStartDate
    ? new Date(req.body.emiStartDate).toISOString().split("T")[0]
    : null;

  const dateChanged =
    newEmiStartDate && oldEmiStartDate && newEmiStartDate !== oldEmiStartDate;

  if (dateChanged) {
    const oldDate = normalizeToMidnight(new Date(loan.emiStartDate));
    const newDate = normalizeToMidnight(new Date(req.body.emiStartDate));
    const monthDiff = differenceInCalendarMonths(newDate, oldDate);

    const emis = await InterestEMI.find({ interestLoanId: loan._id }).sort({
      emiNumber: 1,
    });

    if (emis.length > 0) {
      // Shift existing EMIs
      for (const emi of emis) {
        emi.dueDate = addMonths(new Date(emi.dueDate), monthDiff);
        await emi.save();
      }

      // Catch-up logic after shift
      const today = normalizeToMidnight(new Date());
      let lastEmi = emis[emis.length - 1];
      let currentEmiDate = addMonths(new Date(lastEmi.dueDate), 1);
      let emiNum = lastEmi.emiNumber + 1;

      const r = parseFloat(req.body.interestRate || loan.interestRate) || 0;
      const initialP =
        (req.body.disbursement || loan.disbursement || []).reduce(
          (sum, d) => sum + (parseFloat(d.amount) || 0),
          0,
        ) ||
        loan.initialPrincipalAmount ||
        0;

      while (currentEmiDate <= today) {
        const emiInterestAmount = Math.ceil(initialP * (r / 100));
        await InterestEMI.create({
          interestLoanId: loan._id,
          loanNumber: loan.loanNumber,
          customerName: req.body.customerName || loan.customerName,
          emiNumber: emiNum,
          dueDate: new Date(currentEmiDate),
          interestAmount: emiInterestAmount,
          status: "Pending",
        });

        emiNum++;
        currentEmiDate = addMonths(currentEmiDate, 1);
        if (emiNum > 120) break;
      }
    } else {
      // No EMIs exist yet, just run the standard generation loop
      const today = normalizeToMidnight(new Date());
      let currentEmiDate = normalizeToMidnight(new Date(req.body.emiStartDate));
      const r = parseFloat(req.body.interestRate || loan.interestRate) || 0;
      const initialP =
        (req.body.disbursement || loan.disbursement || []).reduce(
          (sum, d) => sum + (parseFloat(d.amount) || 0),
          0,
        ) ||
        loan.initialPrincipalAmount ||
        0;

      let emiNum = 1;
      while (emiNum === 1 || currentEmiDate <= today) {
        const emiInterestAmount = Math.ceil(initialP * (r / 100));
        const isFirst = emiNum === 1;

        const emi = await InterestEMI.create({
          interestLoanId: loan._id,
          loanNumber: loan.loanNumber,
          customerName: req.body.customerName || loan.customerName,
          emiNumber: emiNum,
          dueDate: new Date(currentEmiDate),
          interestAmount: emiInterestAmount,
          amountPaid: isFirst ? emiInterestAmount : 0,
          status: isFirst ? "Paid" : "Pending",
          paymentDate: isFirst
            ? new Date(req.body.startDate || loan.startDate)
            : null,
          paymentMode: isFirst
            ? req.body.paymentMode || loan.paymentMode || "Cash"
            : "",
          remarks: isFirst ? "Auto-paid First EMI" : "",
          paymentHistory: isFirst
            ? [
                {
                  amount: emiInterestAmount,
                  mode: req.body.paymentMode || loan.paymentMode || "Cash",
                  date: new Date(req.body.startDate || loan.startDate),
                  addedBy: req.user._id,
                },
              ]
            : [],
          updatedBy: isFirst ? req.user._id : undefined,
        });

        if (isFirst) {
          const Payment = require("../models/Payment");
          await Payment.create({
            emiId: emi._id,
            loanId: loan._id,
            loanModel: "InterestLoan",
            amount: emiInterestAmount,
            mode: req.body.paymentMode || loan.paymentMode || "Cash",
            paymentDate: new Date(req.body.startDate || loan.startDate),
            paymentType: "Interest",
            status: "Success",
            remarks: "Auto-paid First EMI",
            collectedBy: req.user._id,
          });
        }

        emiNum++;
        currentEmiDate = addMonths(currentEmiDate, 1);
        if (emiNum > 120) break;
      }
    }
  }

  if (req.body.disbursement || req.body.principalPayments) {
    const initialP = (
      req.body.disbursement ||
      loan.disbursement ||
      []
    ).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const paidP = (
      req.body.principalPayments ||
      loan.principalPayments ||
      []
    ).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    req.body.initialPrincipalAmount = initialP;
    req.body.remainingPrincipalAmount = initialP - paidP;
    if (req.body.remainingPrincipalAmount <= 0) {
      req.body.status = "Closed";
    }
  }

  req.body.updatedBy = req.user._id;

  const updatedLoan = await InterestLoan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  sendResponse(res, 200, "success", "Loan updated successfully", null, updatedLoan);
});

// Delete Interest Loan
exports.deleteInterestLoan = asyncHandler(async (req, res, next) => {
  const loan = await InterestLoan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  await InterestEMI.deleteMany({ interestLoanId: loan._id });
  await Payment.deleteMany({ loanId: loan._id, loanModel: "InterestLoan" });
  await loan.deleteOne();

  sendResponse(res, 200, "success", "Interest loan deleted successfully");
});
